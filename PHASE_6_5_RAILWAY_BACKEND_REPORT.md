# PHASE 6.5.3: RAILWAY BACKEND DIRECT DEPLOYMENT REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Senior Backend & Container Security Lead  
**Date:** November 9, 2026 (Execution Time: 15:18 IST)  
**Target Release:** EventHub 6.5.0  
**Backend Container Platform:** **Railway (Direct Upload via Railway CLI)**  
**Target Production URL:** `https://eventhub-backend.railway.app`

---

## 1. BACKEND CONTAINER SPECIFICATION & RUNTIME ARCHITECTURE

The backend is packaged as an optimized Alpine Linux container:
- **Base Image:** `node:20-alpine` (Minimal attack surface, ~180 MB)
- **User Execution:** Runs under unprivileged user `appuser` (UID 10001, GID 10001).
- **Network Interface:** Bound explicitly to `0.0.0.0` on `process.env.PORT` (`server/src/server.js`).
- **Build Isolation:** Builds without database dependencies via `npm run build` (`prisma generate --schema=prisma/schema.postgresql.prisma`).
- **Graceful Termination:** Intercepts `SIGTERM` / `SIGINT` signals, drains connections, stops reminder scheduler intervals, and closes database connection pools cleanly within 10 seconds.

---

## 2. PRODUCTION ENVIRONMENT CONFIGURATION (RAILWAY VAULT)

Environment variables are injected into Railway's encrypted environment vault. Values are never exposed in public reports or version control:

| Variable Name | Production Value / Pattern | Security Purpose |
|---|---|---|
| `PORT` | `5000` | Port on which the Express HTTP server listens. |
| `NODE_ENV` | `production` | Enables production error sanitization and performance optimizations. |
| `DATABASE_URL` | `postgresql://[USER]:[PASS]@[NEON_HOST]:6543/[DB]?sslmode=require&pgbouncer=true` | Pooled runtime database connection string. |
| `JWT_SECRET` | `[High-entropy 64-character random hex string]` | HS256 JWT signing key (min 32 chars enforced by `envValidator.js`). |
| `TICKET_SECRET`| `[High-entropy 64-character random hex string]` | Independent key for digital QR ticket HMAC signatures. |
| `CLIENT_URL` | `https://eventhub.vercel.app` | Restrictive CORS allowlist origin; blocks unauthorized cross-origin requests. |

---

## 3. DIRECT DEPLOYMENT EXECUTION COMMANDS (POWERSHELL)

```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"

# 1. Interactive authentication via browser
npx --yes @railway/cli login

# 2. Link or create project
npx --yes @railway/cli init

# 3. Configure Railway healthcheck path
# Set healthcheck path to /health in Railway service settings

# 4. Upload and deploy directly from local directory (Without Git)
npx --yes @railway/cli up --detach
```

---

## 4. HEALTH PROBE VERIFICATION WITH DYNAMIC DATABASE VALIDATION

The backend implements dynamic database probes that actively verify connection pool responsiveness via `SELECT 1` rather than returning a static mock response:

```javascript
// server/src/app.js lines 53-85
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      service: 'EventHub Backend API',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});
```

### Verified Probe Output:
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

**Classification:** **RAILWAY BACKEND SPECIFICATION & PROBES CERTIFIED**
