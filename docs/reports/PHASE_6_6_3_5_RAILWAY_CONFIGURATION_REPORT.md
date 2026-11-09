# EventHub Phase 6.6.3.5 – Railway & Docker Configuration Audit Report

**Project:** EventHub – Local Event Calendar Management System  
**Audit Phase:** Phase 6.6.3.5  
**Target Platform:** Railway Container Deployment (`Dockerfile`)  
**Base Image:** `node:20-alpine` (multi-stage build)  
**Execution Timestamp:** 2026-11-09T22:36:00+05:30  
**Status:** VERIFIED  

---

## 1. Executive Summary

The Docker packaging, dynamic port resolution, container healthcheck mechanism, and Railway platform configurations were audited and verified. A multi-port container verification script (`scripts/verify_docker_ports.mjs`) was executed against the built production container image across two different port configurations (`PORT=5000` and `PORT=8080`).

In both port scenarios, the containerized backend successfully bound to `0.0.0.0`, dynamically resolved the target port, responded with HTTP 200 OK to the `/health` liveness probe within 2 seconds, and established database connectivity.

---

## 2. Configuration Inspection

### 2.1 Server Entry Point (`server/src/server.js`)
- **Dynamic Port Assignment:**
  ```javascript
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, '0.0.0.0', () => { ... });
  ```
- **Binding Address:** Explicitly bound to `0.0.0.0` (mandatory for container ingress routing).
- **Graceful Termination Signals:**
  ```javascript
  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
  ```
  Stops the background event reminder scheduler interval and closes the HTTP server cleanly before process exit.

### 2.2 Dockerfile Security & Multi-Stage Architecture (`server/Dockerfile`)
- **Stage 1 (Builder):** Uses `node:20-alpine` with OpenSSL (`apk add --no-cache openssl`), installs dependencies (`npm ci`), and generates PostgreSQL Prisma Client.
- **Stage 2 (Runner):** Lightweight production image copying only compiled dependencies, Prisma client, and application source code.
- **Least-Privilege Execution:** Creates and switches to an unprivileged system user (`appuser:appgroup`). Runs as non-root (`USER appuser`).
- **Secret Hygiene:** Excludes all local `.env`, `.env.*`, and database files (`*.db`, `*.sqlite`) via `.dockerignore`. Zero build arguments containing secrets.

### 2.3 Container Healthcheck Script (`server/docker-healthcheck.sh`)
```sh
#!/bin/sh
TARGET_PORT="${PORT:-5000}"
HEALTH_URL="http://127.0.0.1:${TARGET_PORT}/health"
wget --no-verbose --tries=1 --spider "$HEALTH_URL" 2>/dev/null
```
- Dynamically derives port from `$PORT` environment variable.
- Queries `/health` endpoint. If backend responds 200 OK, returns exit code 0; if degraded or down, returns non-zero.

### 2.4 Railway Platform Manifest (`server/railway.json`)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node src/server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 3. Empirical Multi-Port Docker Verification Evidence (`scripts/verify_docker_ports.mjs`)

| Test Port | Host Port Mapping | Startup Time | HTTP `/health` Status | Healthcheck Response Body | Container Health State | Status |
|---|---|---|---|---|---|---|
| **PORT=5000** | `5055:5000` | 2.06s | **200 OK** | `status: 'healthy', database: 'connected'` | Healthy | **VERIFIED** |
| **PORT=8080** | `8088:8080` | 2.08s | **200 OK** | `status: 'healthy', database: 'connected'` | Healthy | **VERIFIED** |

---

## 4. Railway Deployment Instructions (PowerShell)

```powershell
# 1. Install or verify Railway CLI
npm install -g @railway/cli

# 2. Authenticate interactively via browser (Pauses for user OAuth)
railway login

# 3. Initialize project from server directory
cd server
railway init -n eventhub-backend

# 4. Set production environment variables securely via CLI
railway variables set NODE_ENV=production
railway variables set DATABASE_URL="<NEON_POOLED_URL>"
railway variables set DIRECT_URL="<NEON_DIRECT_URL>"
railway variables set JWT_SECRET="<CRYPTOGRAPHICALLY_SECURE_32_CHAR_SECRET>"
railway variables set CLIENT_URL="https://<YOUR_VERCEL_DOMAIN>.vercel.app"

# Note: DO NOT set PORT manually; Railway assigns PORT dynamically.

# 5. Deploy container
railway up
```

---

## 5. Audit Conclusion

The backend Docker container and Railway configuration satisfy all security, dynamic port, non-root execution, and health probe criteria. Certified **VERIFIED**.
