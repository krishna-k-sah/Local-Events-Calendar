# PHASE 6.6.3.2 — RAILWAY BACKEND PRODUCTION REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.2  
**Target Platform:** Railway App Container Service  
**Deployment Strategy:** Direct Local Directory Deployment (Without GitHub)  
**Status:** **DOCKER CONTAINER VERIFIED LOCALLY — PENDING CLOUD ACTIVATION**

---

## 1. Verification State Breakdown

- [x] **Verified Locally:** Multi-stage Docker container build (`node:20-alpine` + `openssl`), dynamic port script (`server/docker-healthcheck.sh`), non-root execution (`appuser`), Express bound to `0.0.0.0:${PORT}`, declarative `server/railway.json` manifest.
- [ ] **Pending User Authorization:** Interactive browser OAuth authentication (`npx @railway/cli login`).
- [ ] **Pending Cloud Execution:** Railway project initialization and container deployment (`npx @railway/cli up`).
- [ ] **Not Tested:** Live Railway HTTP endpoints and uptime latency.

---

## 2. Docker Container & Dynamic Port Behavior

1. **Alpine OpenSSL Integration:**
   - Both `builder` and `runner` stages include `RUN apk add --no-cache openssl`.
   - Eliminates OpenSSL detection warnings on Alpine Linux.
2. **Dedicated Healthcheck Script:**
   - [`server/docker-healthcheck.sh`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/docker-healthcheck.sh) evaluates `TARGET_PORT="${PORT:-5000}"` and issues `wget http://127.0.0.1:${TARGET_PORT}/health`.
3. **Local Container Execution Evidence:**
   - Container launched with `PORT=8085` connected to local PostgreSQL.
   - Status: `Up (healthy)`.
   - Healthcheck log: `GET /health 200 6.495 ms`.
   - Express output: `EventHub Backend Server listening on port 8085`.

---

## 3. Production Variables Configuration

| Variable | Method of Input | Value / Source |
|---|---|---|
| `NODE_ENV` | Railway CLI / Dashboard | `production` |
| `DATABASE_URL` | Railway CLI / Dashboard | Neon pooled connection string |
| `DIRECT_URL` | Railway CLI / Dashboard | Neon direct connection string |
| `JWT_SECRET` | Railway Dashboard UI (Masked) | 128-hex character cryptographic secret |
| `CLIENT_URL` | Railway CLI / Dashboard | Vercel production origin (`https://*.vercel.app`) |

*Security Constraint:* No static `PORT=5000` is configured on Railway, allowing Railway to dynamically assign the runtime port without conflict.

---

## 4. Railway Deployment Execution Commands

Run from `server/`:
```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"

# 1. Interactive OAuth
npx @railway/cli login

# 2. Initialize project
npx @railway/cli init

# 3. Configure variables
npx @railway/cli variable set NODE_ENV="production"
npx @railway/cli variable set DATABASE_URL="<neon-pooled-url>"
npx @railway/cli variable set DIRECT_URL="<neon-direct-url>"
# Configure JWT_SECRET directly via Railway Dashboard Settings -> Variables

# 4. Deploy Docker container
npx @railway/cli up

# 5. Generate public domain
npx @railway/cli domain
```
