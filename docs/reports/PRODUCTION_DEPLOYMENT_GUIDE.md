# EVENTHUB: PRODUCTION DEPLOYMENT & OPERATIONS RUNBOOK
**Local Event Calendar Management System**  
**Version:** 5.2.0-PROD  
**Target Environment:** Linux / Ubuntu 22.04 LTS / Docker / AWS / GCP / DigitalOcean  

---

## 1. SYSTEM ARCHITECTURE & REQUIREMENTS

EventHub is designed as a modular, decoupled full-stack application:

```
                      +-----------------------------+
                      |   Cloudflare / CDN / WAF    |
                      +--------------+--------------+
                                     |
                       HTTPS:443     v
                      +-----------------------------+
                      |    Nginx Reverse Proxy      |
                      +-------+-------------+-------+
                              |             |
           Static Assets /    |             |  /api/*
           Single Page App    |             |
                              v             v
       +------------------------+      +------------------------+
       |   client/dist (Build)  |      | Express API (Node.js)  |
       |  Vite + React SPA      |      | PM2 Cluster (Port 5000)|
       +------------------------+      +-----------+------------+
                                                   |
                                                   | Prisma ORM
                                                   v
                                       +------------------------+
                                       | PostgreSQL 15+ Cluster |
                                       | Connection Pooling     |
                                       +------------------------+
```

### Minimum System Specifications
- **CPU:** 2 vCPU
- **RAM:** 4 GB
- **Disk:** 20 GB SSD
- **Runtime:** Node.js v20+ LTS or v22+ LTS
- **Database:** PostgreSQL 15 or 16
- **Reverse Proxy:** Nginx 1.20+ with SSL/TLS 1.3

---

## 2. PRODUCTION ENVIRONMENT VARIABLES

Create `/var/www/eventhub/server/.env` with strict permissions (`chmod 600 .env`):

```bash
# Server Networking
PORT=5000
NODE_ENV=production
CLIENT_URL=https://eventhub.yourdomain.com

# Database Connection (PostgreSQL Production)
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public&connection_limit=20&pool_timeout=10
DATABASE_URL="postgresql://eventhub_admin:REPLACE_WITH_STRONG_DB_PASSWORD@localhost:5432/eventhub_prod?schema=public&connection_limit=20"

# Cryptographic Authentication & Ticketing
# FATAL: Must be at least 32 cryptographically random characters
# Generate with: openssl rand -base64 48
JWT_SECRET="e9a71f04b2c18d3e91a0c4f826d17b5e8a329c0f41b7d8a23c6e91f083b4a2c5"
JWT_EXPIRES_IN="7d"

# File Storage & Limits
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_BYTES=5242880

# Logging & Telemetry
LOG_LEVEL=info
```

---

## 3. POSTGRESQL DATABASE INITIALIZATION & MIGRATIONS

### 3.1 Provision Database & User in PostgreSQL
Execute as the `postgres` superuser:

```sql
-- Connect to PostgreSQL
sudo -u postgres psql

-- Create production database and dedicated user
CREATE USER eventhub_admin WITH ENCRYPTED PASSWORD 'REPLACE_WITH_STRONG_DB_PASSWORD';
CREATE DATABASE eventhub_prod OWNER eventhub_admin;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE eventhub_prod TO eventhub_admin;

-- Connect to eventhub_prod and set search_path
\c eventhub_prod
GRANT ALL ON SCHEMA public TO eventhub_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO eventhub_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO eventhub_admin;
\q
```

### 3.2 Apply Production Schema & Migrations
On the application server:

```bash
cd /var/www/eventhub/server

# 1. Install production dependencies
npm ci --omit=dev

# 2. Generate Prisma Client against PostgreSQL schema
npx prisma generate --schema=prisma/schema.postgresql.prisma

# 3. Apply schema migration to production database
npx prisma db push --schema=prisma/schema.postgresql.prisma

# 4. Seed system roles, default admin account, and taxonomies
node prisma/seed.js
```

---

## 4. FRONTEND BUILD & STATIC ASSET OPTIMIZATION

```bash
cd /var/www/eventhub/client

# 1. Install dependencies
npm ci

# 2. Build production bundle
npm run build
```

This compiles optimized bundles to `client/dist` (with manual code-splitting for FullCalendar, Recharts, Lucide icons, and route views).

---

## 5. NGINX REVERSE PROXY CONFIGURATION

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

    # SSL Certificates (e.g. Certbot Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/eventhub.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/eventhub.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Maximum file upload size (Matches server multer limit of 5MB + overhead)
    client_max_body_size 8M;

    # Static Frontend SPA
    root /var/www/eventhub/client/dist;
    index index.html;

    # Serve static files with caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # SPA Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Uploaded Media Serving
    location /uploads/ {
        alias /var/www/eventhub/server/uploads/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    # Backend API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and test configuration:
```bash
sudo ln -s /etc/nginx/sites-available/eventhub.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. PM2 PROCESS MANAGEMENT

Create `ecosystem.config.cjs` in `/var/www/eventhub/`:

```javascript
module.exports = {
  apps: [
    {
      name: 'eventhub-api',
      script: 'server/src/server.js',
      instances: 'max', // Scales across available CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'eventhub-reminder-worker',
      script: 'server/src/server.js',
      instances: 1, // Single dedicated scheduler instance
      exec_mode: 'fork',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
    },
  ],
};
```

Start and save processes:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 7. AUTOMATED BACKUP & DISASTER RECOVERY

Create `/usr/local/bin/eventhub-backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/eventhub"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="eventhub_prod"
DB_USER="eventhub_admin"

mkdir -p "$BACKUP_DIR"

# Create compressed PostgreSQL dump
pg_dump -U "$DB_USER" -h localhost "$DB_NAME" | gzip > "$BACKUP_DIR/eventhub_db_$TIMESTAMP.sql.gz"

# Backup uploaded poster assets
tar -czf "$BACKUP_DIR/eventhub_uploads_$TIMESTAMP.tar.gz" -C /var/www/eventhub/server uploads

# Retain backups for 14 days, delete older
find "$BACKUP_DIR" -type f -mtime +14 -name "*.gz" -delete

echo "[$TIMESTAMP] Backup completed successfully."
```

Set permissions and cron:
```bash
chmod +x /usr/local/bin/eventhub-backup.sh

# Add to root crontab (runs daily at 02:00 UTC)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/eventhub-backup.sh >> /var/log/eventhub_backup.log 2>&1") | crontab -
```

---

## 8. HEALTH CHECK & MONITORING

- **Endpoint:** `GET https://eventhub.yourdomain.com/api/health`
- **Expected Status:** `200 OK`
- **Payload:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-11-09T07:30:00.000Z",
  "uptime": 86400
}
```
If the database connection is interrupted, the endpoint returns `503 Service Unavailable` with `"database": "disconnected"`.

