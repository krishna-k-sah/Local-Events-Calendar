# PHASE 6.6.3.1 — CLOUD ACTIVATION REPORT & EXECUTION RUNBOOK
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.1  
**Execution Mode:** Direct Local Cloud Deployment (Without GitHub)  
- **Database:** Neon Serverless PostgreSQL 16 (`eventhub_production`)  
- **Backend:** Railway Container Service (`eventhub-backend`)  
- **Frontend:** Vercel Global Edge Network (`eventhub-client`)  
**Status:** **PRE-DEPLOYMENT GATES PASSED — INTERACTIVE ACTIVATION PRIMED**

---

## 1. Activation Prerequisites Status

| Component | Target Service | Local Code Preparation | Cloud Resource Status |
|---|---|---|---|
| **Database** | Neon Serverless PostgreSQL 16 | 100% Prepared (`schema.postgresql.prisma` with `directUrl`) | Pending User Project Creation |
| **Backend** | Railway Container Service | 100% Prepared (Dockerfile + `docker-healthcheck.sh` + `railway.json`) | Pending User Browser OAuth |
| **Frontend** | Vercel Edge Network | 100% Prepared (SPA rewrite + dynamic API URL normalization) | Pending User Browser OAuth |

---

## 2. Phase 1: Neon Database Activation Runbook

1. **Sign in to Neon:**
   Open [console.neon.tech](https://console.neon.tech).
2. **Create Project & Database:**
   - **Project Name:** `eventhub-production`
   - **Database Name:** `eventhub_production`
   - **Postgres Engine:** `PostgreSQL 16`
3. **Copy Connection Strings:**
   - `DATABASE_URL`: Pooled connection string (`ep-*-pooler.*.aws.neon.tech`)
   - `DIRECT_URL`: Direct compute connection string (`ep-*.*.aws.neon.tech`)
4. **Deploy Migrations from Local Terminal:**
   ```powershell
   Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"
   $env:DATABASE_URL="<your-neon-pooled-url>"
   $env:DIRECT_URL="<your-neon-direct-url>"
   node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.postgresql.prisma
   ```

---

## 3. Phase 2: Railway Backend Activation Runbook

1. **Authenticate Railway CLI:**
   ```powershell
   Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"
   npx @railway/cli login
   ```
2. **Initialize Project:**
   ```powershell
   npx @railway/cli init
   ```
   *Action:* Choose `Empty Project` and name it `eventhub-backend-prod`.
3. **Configure Environment Variables:**
   ```powershell
   npx @railway/cli variable set NODE_ENV="production"
   npx @railway/cli variable set DATABASE_URL="<your-neon-pooled-url>"
   npx @railway/cli variable set DIRECT_URL="<your-neon-direct-url>"
   ```
   *Note: Set `JWT_SECRET` via Railway Dashboard or generate a 128-hex character secret locally.*
4. **Deploy Container:**
   ```powershell
   npx @railway/cli up
   ```
5. **Assign Public Domain:**
   ```powershell
   npx @railway/cli domain
   ```
   *Output:* Returns `https://[RAILWAY-SERVICE-DOMAIN].up.railway.app`.

---

## 4. Phase 3: Vercel Frontend Activation Runbook

1. **Authenticate Vercel CLI:**
   ```powershell
   Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\client"
   npx vercel login
   ```
2. **Deploy Preview Stage:**
   ```powershell
   npx vercel --build-env VITE_API_URL="https://[RAILWAY-SERVICE-DOMAIN].up.railway.app"
   ```
   *Action:* Inspect preview URL in browser. Test login and event browsing against the Railway backend.
3. **Promote to Production:**
   ```powershell
   npx vercel deploy --prod --build-env VITE_API_URL="https://[RAILWAY-SERVICE-DOMAIN].up.railway.app"
   ```
   *Output:* Returns production canonical URL `https://[VERCEL-APP-DOMAIN].vercel.app`.
4. **Sync CORS on Railway:**
   ```powershell
   Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"
   npx @railway/cli variable set CLIENT_URL="https://[VERCEL-APP-DOMAIN].vercel.app"
   ```

---

## 5. Phase 4: Full Stack Verification Checklist

After activation, the following endpoints will be verified:
- [ ] Backend `/health` returns `{"status":"healthy","database":"connected"}`.
- [ ] Frontend loads `LandingPage` in under 1 second.
- [ ] Attendee registration and JWT storage in `localStorage`.
- [ ] Event ticket booking generates valid signed QR code.
- [ ] Admin dashboard renders Recharts analytics graphs with zero errors.
