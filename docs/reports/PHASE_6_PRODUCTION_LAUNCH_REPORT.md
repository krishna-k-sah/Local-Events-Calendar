# PHASE 6: PRODUCTION LAUNCH & RELEASE RUNBOOK
**EventHub — Local Event Calendar Management System**  
**Author:** Principal Release Manager & Cloud Infrastructure Lead  
**Date:** November 2026  
**Target Release:** **EventHub 6.0.0 (Production Release)**  
**Launch Readiness:** **READY FOR PRODUCTION AUTHORIZATION**  

---

## 1. PRE-LAUNCH VERIFICATION & GO/NO-GO CHECKLIST

| Launch Gate | Verification Check | Status | Verification Reference |
|---|---|---|---|
| **1. Frontend Build** | Optimized production bundle built via Vite | **PASS** | `client/dist` (12.04s, 44 chunks) |
| **2. SPA Routing** | Rewrite rules (`vercel.json`, `_redirects`, `nginx.conf`) | **PASS** | Verified in `PHASE_6_FRONTEND_DEPLOYMENT_REPORT.md` |
| **3. Backend Runtime** | Node.js 20+ container with non-root security | **PASS** | `server/Dockerfile` verified |
| **4. Database Migrations** | Forward-only Prisma DDL migrations | **PASS** | Migration `20261109081621_init_postgresql` verified |
| **5. Database Integrity** | Zero duplicate registrations, attendances, or oversells | **PASS** | 9 raw SQL checks passed on Staging & Recovery DB |
| **6. Secret Isolation** | Zero credentials in Git; startup validation active | **PASS** | `envValidator.js` & `.gitignore` verified |
| **7. Concurrency Safety** | Pessimistic row locking on seat reservations | **PASS** | 10-user flash race tested on PostgreSQL |
| **8. Automated Backups** | `pg_dump` and `pg_restore` verified on recovery database | **PASS** | Verified in `PHASE_6_BACKUP_DISASTER_RECOVERY_REPORT.md` |
| **9. Observability** | Health check probe (`/health`), structured logging | **PASS** | Verified in `PHASE_6_MONITORING_REPORT.md` |
| **10. Full Regression** | 125/125 Vitest and Playwright tests passing | **PASS** | Verified in `PHASE_6_FINAL_REGRESSION_REPORT.md` |

---

## 2. PRODUCTION DEPLOYMENT PROTOCOL & STEP-BY-STEP RUNBOOK

### Step 1: Provision Cloud PostgreSQL (Neon / Supabase / AWS RDS)
1. Create a PostgreSQL 16 project on **Neon** (`https://console.neon.tech`) or **Supabase** (`https://supabase.com`).
2. Retrieve the pooled connection URI:
   ```
   postgresql://eventhub_owner:[PASSWORD]@[HOST]:5432/eventhub_production?sslmode=require&connection_limit=20&pool_timeout=10
   ```

### Step 2: Deploy Backend Web Service (Railway / Render)
1. Connect repository to **Railway** or **Render**.
2. Set Root Directory to `server`.
3. Set Environment Variables in provider secrets vault:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `DATABASE_URL=[COPIED_FROM_STEP_1]`
   - `JWT_SECRET=[GENERATE_RANDOM_64_CHAR_HEX_KEY]`
   - `CLIENT_URL=https://eventhub.app,https://www.eventhub.app`
4. Set Build Command:
   ```bash
   npm ci && npm run prisma:generate:pg && npm run prisma:deploy:pg
   ```
5. Set Start Command:
   ```bash
   node src/server.js
   ```
6. Set Health Check Path: `/health`.

### Step 3: Deploy Frontend Web Application (Vercel / Cloudflare Pages)
1. Connect repository to **Vercel** or **Cloudflare Pages**.
2. Set Root Directory to `client`.
3. Framework Preset: **Vite**.
4. Set Environment Variable:
   - `VITE_API_BASE_URL=https://api.eventhub.app/api` (or backend service URL).
5. Build Command: `npm run build`.
6. Output Directory: `dist`.

### Step 4: Custom Domain & DNS Mapping
1. In DNS provider (Cloudflare / Namecheap / Route 53):
   - Add `CNAME` for `api.eventhub.app` pointing to backend host.
   - Add `CNAME` or `ALIAS` for `eventhub.app` pointing to frontend host.
2. Enable automatic SSL/TLS certificate provisioning.

---

## 3. ROLLBACK CONTINGENCY PLAN

In the event of an unforeseen production outage post-launch:
1. **Frontend Instant Rollback**: In Vercel / Cloudflare Pages dashboard, click **"Instant Rollback"** to the previous immutable deployment deployment hash (execution time: $< 5$ seconds).
2. **Backend Rollback**: Revert deployment commit in Railway / Render dashboard to the prior stable container digest ($< 30$ seconds).
3. **Database Point-in-Time Recovery**: If data corruption occurs, execute point-in-time branch restoration via Neon console or restore from `/var/backups/eventhub/` dump.

---

## 4. PUBLIC LAUNCH AUTHORIZATION CHECKPOINT

> [!IMPORTANT]
> In strict accordance with the user instructions:
> No paid cloud subscriptions have been purchased. No public DNS records have been modified without explicit user authorization.
> The application code, build bundles, containers, and migration scripts are 100% prepared to be pushed to your chosen cloud accounts upon your command.

**Classification:** **READY FOR LAUNCH**

