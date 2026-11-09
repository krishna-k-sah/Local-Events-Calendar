# PHASE 6.6.2 — DEPLOYMENT PROGRESS & EXECUTION RUNBOOK
**EventHub – Local Event Calendar Management System**
**Architecture:** Direct Cloud Deployment (Without GitHub)  
- **Database:** Neon Serverless PostgreSQL 16  
- **Backend API:** Railway Container Service (Node.js 20 / Express / Prisma)  
- **Frontend SPA:** Vercel Global Edge Network (React 18 / Vite / Tailwind)  
**Target Release:** EventHub 6.6.2  
**Date:** 2026-11-09  

---

## 1. Deployment Architecture Diagram

```
+-------------------------------------------------------------------------+
|                              END USERS                                  |
+-------------------------------------------------------------------------+
                                    |
                                    v HTTPS
+-------------------------------------------------------------------------+
|                  VERCEL GLOBAL EDGE NETWORK (Frontend)                  |
|  - URL: https://eventhub-client.vercel.app (or custom domain)           |
|  - Static Assets, React SPA, Code-Split Chunks, Tailwind CSS            |
|  - Environment: VITE_API_URL=https://eventhub-backend.up.railway.app    |
+-------------------------------------------------------------------------+
                                    |
                                    v REST API / JSON (CORS Allowed)
+-------------------------------------------------------------------------+
|                     RAILWAY APP ENGINE (Backend)                        |
|  - URL: https://eventhub-backend.up.railway.app                         |
|  - Alpine Docker Container, Node 20, Express, Helmet, Rate Limiter      |
|  - Port: 0.0.0.0:${PORT}                                                |
|  - Environment:                                                         |
|      NODE_ENV=production                                                |
|      DATABASE_URL=postgresql://...neon.tech/eventhub?sslmode=require    |
|      JWT_SECRET=[Production Secret]                                     |
|      CLIENT_URL=https://eventhub-client.vercel.app                      |
+-------------------------------------------------------------------------+
                                    |
                                    v TLS 1.3 / Port 5432
+-------------------------------------------------------------------------+
|                   NEON SERVERLESS POSTGRESQL 16                         |
|  - 14 Relational Tables, Row-Level Locking, Auto-scaling                |
|  - Connection Pooling via pgBouncer                                     |
+-------------------------------------------------------------------------+
```

---

## 2. Component 1: Neon PostgreSQL Database Activation

### Pre-requisites
1. Open [Neon Console](https://console.neon.tech) in your browser.
2. Create a new project:
   - **Project Name:** `eventhub-production`
   - **Postgres Version:** `PostgreSQL 16`
   - **Region:** Select closest region (e.g., `us-east-2` or `eu-central-1`)
3. Copy the pooled connection string formatted as:
   `postgresql://<user>:<password>@<neon-hostname>/eventhub_db?sslmode=require`

### Apply Database Migrations
Run the following in PowerShell from the project root:
```powershell
$env:DATABASE_URL="postgresql://<user>:<password>@<neon-hostname>/eventhub_db?sslmode=require"
node ./server/node_modules/prisma/build/index.js migrate deploy --schema=./server/prisma/schema.postgresql.prisma
```
*Expected Output:*
```
14 migrations applied
The PostgreSQL database is now in sync with the schema.
```

---

## 3. Component 2: Railway Backend Deployment

Railway enables direct container deployment from your local Windows terminal without requiring GitHub integration.

### Step-by-Step Execution:
1. **Navigate to the server directory:**
   ```powershell
   Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"
   ```

2. **Authenticate with Railway CLI:**
   ```powershell
   npx @railway/cli login
   ```
   *Action:* Opens browser for one-click OAuth login.

3. **Initialize Railway Project:**
   ```powershell
   npx @railway/cli init
   ```
   *Action:* Select `Empty Project` -> name it `eventhub-backend-prod`.

4. **Set Production Environment Variables on Railway:**
   ```powershell
   npx @railway/cli variables --set DATABASE_URL="postgresql://<user>:<password>@<neon-hostname>/eventhub_db?sslmode=require"
   npx @railway/cli variables --set NODE_ENV="production"
   npx @railway/cli variables --set PORT="5000"
   npx @railway/cli variables --set JWT_SECRET="[Generate random 64-char hex string]"
   npx @railway/cli variables --set CLIENT_URL="https://[YOUR-VERCEL-DOMAIN].vercel.app"
   ```

5. **Deploy the Backend Container:**
   ```powershell
   npx @railway/cli up
   ```
   *Action:* Uploads the `server/` directory and executes the production `Dockerfile`.

6. **Generate Public Domain:**
   ```powershell
   npx @railway/cli domain
   ```
   *Output:* Returns your production backend endpoint (e.g., `https://eventhub-backend-production.up.railway.app`).

7. **Verify Backend Health:**
   ```powershell
   curl.exe -i "https://eventhub-backend-production.up.railway.app/health"
   ```
   *Expected Output:*
   ```json
   HTTP/2 200
   {"status":"OK","timestamp":"...","environment":"production"}
   ```

---

## 4. Component 3: Vercel Frontend Deployment

Vercel provides instant static SPA hosting and edge CDN distribution directly via CLI.

### Step-by-Step Execution:
1. **Navigate to the client directory:**
   ```powershell
   Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\client"
   ```

2. **Authenticate with Vercel CLI:**
   ```powershell
   npx vercel login
   ```
   *Action:* Complete browser authentication.

3. **Deploy to Production with Backend API Endpoint:**
   ```powershell
   npx vercel deploy --prod --build-env VITE_API_URL="https://eventhub-backend-production.up.railway.app"
   ```
   *Action:* Vercel runs `npm run build` using Vite and deploys the generated `dist/` directory across its global CDN.

4. **Synchronize CORS on Railway:**
   Once Vercel outputs your production URL (e.g. `https://eventhub-local.vercel.app`), update `CLIENT_URL` in Railway:
   ```powershell
   Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"
   npx @railway/cli variables --set CLIENT_URL="https://eventhub-local.vercel.app"
   ```

---

## 5. Live Production Smoke Testing Checklist

Once both services are active:
- [ ] **Health Check:** `curl -i https://[RAILWAY_URL]/health` returns `200 OK`.
- [ ] **Frontend Loading:** Opening `https://[VERCEL_URL]` renders `LandingPage` in under 1 second.
- [ ] **Discovery Grid:** Events populate via API call to `/api/events`.
- [ ] **User Registration:** Create new Attendee user via `/register`.
- [ ] **Ticket Booking:** Register for a free event, verify confirmation dialog.
- [ ] **QR Code Verification:** Open `/my-registrations` and inspect generated QR ticket modal.
- [ ] **Admin Flow:** Log in as Administrator, review analytics charts on `/admin/reports`, and verify zero console errors.

---

## 6. Current Deployment Status

All local prerequisites, container builds, Prisma schemas, and configuration scripts are **100% complete and validated**. The deployment stands at the exact interactive authentication gate awaiting the user's live cloud OAuth credentials.
