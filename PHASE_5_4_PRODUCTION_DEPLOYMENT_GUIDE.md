# PHASE 5.4: PRODUCTION DEPLOYMENT & OPERATIONS RUNBOOK
**EventHub — Local Event Calendar Management System**  
**Version:** 5.4.0-RC2  
**Target Environment:** Linux / Ubuntu 22.04 LTS / Docker / Managed PostgreSQL (AWS RDS, Neon, Supabase)  

---

## 1. ARCHITECTURAL OVERVIEW

EventHub is structured as a decoupled, multi-tier application:

```
[ Client Browser ] ---- HTTPS (443) ----> [ Nginx Reverse Proxy ]
                                                  |
                         +------------------------+------------------------+
                         |                                                 |
                         v                                                 v
             [ Static Assets & SPA ]                           [ Express API Cluster ]
             (/var/www/eventhub/client/dist)                   (PM2 / Port 5000)
                                                                           |
                                                                           v
                                                               [ PostgreSQL 15+ Cluster ]
                                                               (eventhub_prod)
```

---

## 2. STEP-BY-STEP DEPLOYMENT RUNBOOK

### Step 1: Provisioning PostgreSQL 15+
Execute as the `postgres` administrative user on your database host:
```sql
-- 1. Create dedicated user with strong password
CREATE USER eventhub_admin WITH ENCRYPTED PASSWORD 'GENERATE_STRONG_DB_PASSWORD_HERE';

-- 2. Create production database
CREATE DATABASE eventhub_prod OWNER eventhub_admin;

-- 3. Grant schema permissions
\c eventhub_prod
GRANT ALL ON SCHEMA public TO eventhub_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO eventhub_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO eventhub_admin;
\q
```

### Step 2: Configuring Secrets & Environment Variables
On the application server, create `/var/www/eventhub/server/.env` with file permissions `chmod 600`:

```bash
# Networking
PORT=5000
NODE_ENV=production
CLIENT_URL=https://eventhub.yourdomain.com

# Database Connection (PostgreSQL Production)
DATABASE_URL="postgresql://eventhub_admin:GENERATE_STRONG_DB_PASSWORD_HERE@localhost:5432/eventhub_prod?schema=public&connection_limit=20&pool_timeout=10"

# Cryptographic Token Signing (FATAL if < 32 characters)
# Generate with: openssl rand -base64 48
JWT_SECRET="a7e8f9b0c1d2e3f4a5b6c7d8e9f0123456789abcdef0123456789abcdef01234"
JWT_EXPIRES_IN="7d"

# Storage & Telemetry
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_BYTES=5242880
LOG_LEVEL=info
```

### Step 3: Deploying the Backend API
```bash
cd /var/www/eventhub/server

# Install production dependencies only
npm ci --omit=dev

# Generate PostgreSQL-specific Prisma Client
npm run prisma:generate:pg
```

### Step 4: Executing Migrations & Seeding
```bash
# Push schema definitions to PostgreSQL
npm run prisma:push:pg

# Seed default system roles (ADMIN, ORGANIZER, ATTENDEE) and initial taxonomies
npm run prisma:seed
```

### Step 5: Building & Deploying the Frontend SPA
```bash
cd /var/www/eventhub/client

# Install dependencies and build optimized production chunks
npm ci
npm run build
```
This outputs static assets to `/var/www/eventhub/client/dist`.

### Step 6: Configuring Nginx & HTTPS
Create `/etc/nginx/sites-available/eventhub.conf`:
```nginx
server {
    listen 80;
    server_name eventhub.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name eventhub.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/eventhub.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/eventhub.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    client_max_body_size 8M;

    root /var/www/eventhub/client/dist;
    index index.html;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /uploads/ {
        alias /var/www/eventhub/server/uploads/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/eventhub.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Step 7: Process Management with PM2
In `/var/www/eventhub/`:
```bash
# Start cluster using ecosystem config
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Step 8: Verifying the Deployment
Probe the health-check endpoint:
```bash
curl -i https://eventhub.yourdomain.com/api/health
```
**Expected Response:**
```json
HTTP/2 200 OK
{
  "status": "healthy",
  "database": "connected",
  "environment": "production"
}
```

### Step 9: Database Backup Procedure
Create `/usr/local/bin/eventhub-backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/eventhub"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Generate gzipped PostgreSQL database dump
pg_dump -U eventhub_admin -h localhost eventhub_prod | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Backup uploaded media assets
tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" -C /var/www/eventhub/server uploads

# Retain backups for 14 days
find "$BACKUP_DIR" -type f -mtime +14 -name "*.gz" -delete
```
Schedule via root crontab (`0 2 * * * /usr/local/bin/eventhub-backup.sh`).

### Step 10: Database Restore & Rollback Procedures

#### Database Restore:
```bash
# 1. Stop web nodes to prevent incoming writes
pm2 stop all

# 2. Drop and recreate production database
dropdb -U postgres eventhub_prod
createdb -U postgres -O eventhub_admin eventhub_prod

# 3. Restore from backup archive
gunzip -c /var/backups/eventhub/db_20261109_020000.sql.gz | psql -U eventhub_admin -d eventhub_prod

# 4. Restart web processes
pm2 restart all
```

#### Application Release Rollback:
```bash
# 1. Revert to previous Git release tag
git checkout v5.3.0

# 2. Re-install dependencies & rebuild
npm --prefix server ci --omit=dev
npm --prefix client ci && npm --prefix client run build

# 3. Restart PM2 cluster
pm2 reload all
```

