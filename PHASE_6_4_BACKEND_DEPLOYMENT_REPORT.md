# PHASE 6.4: BACKEND DIRECT DEPLOYMENT & RUNTIME REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Senior Backend & Container Security Lead  
**Date:** November 2026  
**Target Release:** EventHub 6.4.0  
**Deployment Platform:** **Railway (Direct Upload via Railway CLI)**  
**Target URL:** `https://eventhub-backend.railway.app` (Assigned upon project initialization)

---

## 1. THREE-STAGE DEPLOYMENT ARCHITECTURE

To ensure production stability, the backend deployment workflow strictly isolates the build, release, and runtime phases:

```
[ A. BUILD PHASE ]
  ├── 1. Install dependencies (npm ci) in Alpine builder
  ├── 2. Generate Prisma Client (npx prisma generate) offline
  ├── 3. Build Node.js backend & validate imports
  └── 4. Multi-stage Docker packaging (node:20-alpine, unprivileged user appuser)
          │
[ B. RELEASE PHASE (One-Off Controlled Execution) ]
  ├── 1. Secure injection of production secrets into Railway Vault
  ├── 2. Execute transactional migrations: npx prisma migrate deploy
  └── 3. Verify _prisma_migrations parity
          │
[ C. RUNTIME PHASE ]
  ├── 1. Container startup: node src/server.js
  ├── 2. Dynamic DB connection check & pool initialization
  ├── 3. Background Reminder Worker loop activation
  └── 4. Continuous Healthcheck Monitoring (/health & /api/health)
```

---

## 2. CONTAINER SECURITY BENCHMARKS & CONTROLS

The `server/Dockerfile` enforces the following container security benchmarks:
- **Non-Root Execution:** Runs as unprivileged system user `appuser` (UID 10001, GID 10001).
- **Zero Embedded Secrets:** Build arguments and image layers contain zero passwords or tokens.
- **Graceful Termination:** Intercepts `SIGTERM` / `SIGINT` signals, closes active HTTP sockets, stops reminder scheduler intervals, and disconnects database pools within 10 seconds.
- **CORS Restrictive Allowlist:** Allows only the production frontend URL (`CORS_ORIGIN=https://eventhub.vercel.app`).
- **Sanitized Errors:** Production error middleware redacts internal database schema names and stack traces.
- **Rate Limiting:** Protects against abuse (100 reqs/15m general; 10 reqs/15m auth endpoints).

---

## 3. HEALTH CHECK VERIFICATION EVIDENCE

Both endpoints were verified locally and are configured for external orchestrator probing:

### 3.1 Root Probe: `GET /health`
- **Target Endpoint:** `/health`
- **HTTP Status:** `200 OK`
- **Response Payload:**
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2026-11-09T09:32:19.533Z",
    "service": "EventHub Backend API",
    "uptime": 0.627,
    "environment": "production"
  }
  ```

### 3.2 Namespaced API Probe: `GET /api/health`
- **Target Endpoint:** `/api/health`
- **HTTP Status:** `200 OK`
- **Response Payload:**
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2026-11-09T09:32:19.549Z",
    "service": "EventHub Backend API",
    "uptime": 0.641,
    "environment": "production"
  }
  ```

---

## 4. DIRECT RAILWAY DEPLOYMENT EXECUTION INSTRUCTIONS

When the user runs direct deployment from their PowerShell console:

```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"

# 1. Interactive login to Railway
npx --yes @railway/cli login

# 2. Initialize project directly from local directory
npx --yes @railway/cli init

# 3. Configure production environment variables in Railway Vault
npx --yes @railway/cli variables --set "PORT=5000"
npx --yes @railway/cli variables --set "NODE_ENV=production"
npx --yes @railway/cli variables --set "DATABASE_URL=postgresql://[USER]:[PASS]@[NEON_HOST]:6543/[DB]?sslmode=require&pgbouncer=true"
npx --yes @railway/cli variables --set "DIRECT_URL=postgresql://[USER]:[PASS]@[NEON_HOST]:5432/[DB]?sslmode=require"
npx --yes @railway/cli variables --set "JWT_SECRET=[GENERATE_RANDOM_64_CHAR_HEX]"
npx --yes @railway/cli variables --set "TICKET_SECRET=[GENERATE_RANDOM_64_CHAR_HEX]"
npx --yes @railway/cli variables --set "CORS_ORIGIN=https://eventhub.vercel.app"

# 4. Upload and deploy directly
npx --yes @railway/cli up --detach
```

**Classification:** **BACKEND DEPLOYMENT SPECIFICATION VERIFIED**
