# PHASE 6.6.3.1 — RAILWAY CONFIGURATION AUDIT REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.1  
**Audit Date:** 2026-11-09  
**Deployment Target:** Railway Container Service  
**Status:** **AUDITED & ALIGNED WITH SOURCE CODE**

---

## 1. Required Environment Variables from Codebase

By auditing `server/src/server.js`, `server/src/app.js`, `server/src/config/db.js`, and `server/src/config/envValidator.js`, the exact required runtime configuration was identified:

| Variable Name | Required In | Purpose | Source Citation |
|---|---|---|---|
| `NODE_ENV` | All | Sets execution mode (`production`). Disables dev logging, enforces strict secrets. | `server.js` L14, `envValidator.js` L7 |
| `DATABASE_URL` | Production | Pooled connection string to Neon PostgreSQL 16 (via PgBouncer). | `db.js` L12, `schema.postgresql.prisma` L7 |
| `DIRECT_URL` | Production | Direct unpooled connection string to Neon for Prisma DDL operations. | `schema.postgresql.prisma` L8 |
| `JWT_SECRET` | Production | Min 32 chars (recommended 128 hex chars) for signing session tokens. | `jwt.js` L4, `envValidator.js` L20 |
| `CLIENT_URL` | Production | Allowed CORS origins (e.g. `https://eventhub.vercel.app`). | `app.js` L40, `envValidator.js` L31 |

No superfluous or imaginary environment variables are configured.

---

## 2. Dynamic PORT Handling

- **Source Code Verification:** In [`server/src/server.js`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/src/server.js#L10-L13):
  ```javascript
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, '0.0.0.0', ...);
  ```
- **Finding:** Express dynamically reads `process.env.PORT` assigned by Railway at container boot and binds to `0.0.0.0` (all network interfaces).
- **Configuration Correction:** **Static `PORT=5000` overrides have been strictly eliminated** from Railway environment setup instructions. Forcing a static port on Railway breaks container routing if Railway assigns an ephemeral port. Express dynamically adopts whatever port Railway sets.

---

## 3. Declarative Container Manifest (`server/railway.json`)

To prevent ambiguity during deployment, a declarative configuration file was created at [`server/railway.json`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/railway.json):

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

Railway automatically parses this manifest when deployed from `server/`, utilizing the optimized multi-stage `Dockerfile` and probing `/health`.

---

## 4. Current Railway CLI Syntax & Deployment Runbook

Deployments from Windows use the current Railway CLI:

1. **Authenticate:**
   ```powershell
   npx @railway/cli login
   ```
2. **Link or Create Project:**
   ```powershell
   npx @railway/cli init
   ```
3. **Configure Non-Sensitive Variables:**
   ```powershell
   npx @railway/cli variable set NODE_ENV="production"
   npx @railway/cli variable set DATABASE_URL="<neon-pooled-url>"
   npx @railway/cli variable set DIRECT_URL="<neon-direct-url>"
   npx @railway/cli variable set CLIENT_URL="https://[VERCEL-APP-DOMAIN].vercel.app"
   ```
4. **Configure Sensitive Variable (`JWT_SECRET`):**
   Set via Railway Web Dashboard UI or stdin:
   ```powershell
   # Alternatively via Railway Web Dashboard under Settings -> Variables
   ```
5. **Deploy Container:**
   ```powershell
   npx @railway/cli up
   ```
6. **Generate Public Domain:**
   ```powershell
   npx @railway/cli domain
   ```
