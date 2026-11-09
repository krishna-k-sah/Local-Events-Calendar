# PHASE 6.6.3.3 — RAILWAY BACKEND DEPLOYMENT EVIDENCE REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.3  
**Target Platform:** Railway App Container Service  
**Deployment Strategy:** Direct Windows Local Directory Deployment (Without GitHub)  
**Status:** **GATED AT INTERACTIVE OAUTH BOUNDARY**

---

## 1. Local Container Verification Evidence

Prior to cloud activation, the backend containerization was empirically verified on Windows 11:

- **Multi-Stage Dockerfile:** [`server/Dockerfile`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/Dockerfile)
  - Base: `node:20-alpine` with `openssl` package installed in both builder and runner stages.
  - User: Non-root unprivileged `appuser` (UID 10001) in group `appgroup`.
  - Offline Build: `npx prisma generate` runs during build stage without requiring live DB connection.
- **Dynamic Port Healthcheck:** [`server/docker-healthcheck.sh`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/docker-healthcheck.sh)
  - Dynamically evaluates `TARGET_PORT="${PORT:-5000}"`.
  - Probes `http://127.0.0.1:${TARGET_PORT}/health`.
- **Declarative Manifest:** [`server/railway.json`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/railway.json)
  - Builder: `DOCKERFILE`
  - Healthcheck path: `/health` (timeout 100s, max 10 retries on failure).
- **Local Container Run Result:**
  - Container launched with `PORT=8085`.
  - Output: `EventHub Backend Server listening on port 8085`.
  - Status: Transitioned to **`Up (healthy)`** with `GET /health 200 6.495 ms`.

---

## 2. Interactive Railway Deployment Runbook (PowerShell)

Execute the following commands from the `server/` directory:

```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"

# Step 1: Interactive Browser OAuth
npx @railway/cli login

# Step 2: Initialize Railway Project
npx @railway/cli init
# Select "Empty Project", name it "eventhub-backend-prod"

# Step 3: Configure Non-Sensitive Environment Variables
npx @railway/cli variable set NODE_ENV="production"
npx @railway/cli variable set DATABASE_URL="<your-neon-pooled-url>"
npx @railway/cli variable set DIRECT_URL="<your-neon-direct-url>"

# Step 4: Configure JWT_SECRET securely via Railway Web UI
# 1. Generate secret locally: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# 2. In Railway Dashboard -> Service -> Variables -> Add JWT_SECRET

# Step 5: Deploy Docker Container Directly
npx @railway/cli up

# Step 6: Generate Public Domain
npx @railway/cli domain
```

---

## 3. Post-Deployment Verification Checklist

Once Railway provides your public endpoint (e.g. `https://eventhub-backend-prod.up.railway.app`):
1. **Health Check:**
   ```powershell
   curl.exe -i "https://[RAILWAY-SERVICE-DOMAIN].up.railway.app/health"
   ```
   *Expected:* HTTP 200 `{"status":"healthy","database":"connected"}`.
2. **Public Event API:**
   ```powershell
   curl.exe -i "https://[RAILWAY-SERVICE-DOMAIN].up.railway.app/api/events"
   ```
   *Expected:* HTTP 200 `{"events":[],"pagination":{...}}`.
3. **Database Connectivity:** Verified via live `SELECT 1` executed inside the `/health` handler.
