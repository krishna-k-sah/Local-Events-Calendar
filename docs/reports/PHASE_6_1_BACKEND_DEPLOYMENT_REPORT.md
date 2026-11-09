# PHASE 6.1: BACKEND DEPLOYMENT REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Senior Backend Systems Engineer  
**Date:** November 2026  
**Backend Deployment Status:** **STAGING DEPLOYMENT VERIFIED (Awaiting Cloud Host Credentials)**  
**Runtime:** Node.js 20+ / 24.21.0  
**Containerization:** Multi-stage Dockerfile with non-root security  

---

## 1. BACKEND RUNTIME VERIFICATION

| Verification Item | Specification | Implementation Detail | Status |
|---|---|---|---|
| **Container User** | Non-root execution | User `appuser:appgroup` in `server/Dockerfile` | **PASS** |
| **Environment Check**| Fail-fast startup | `validateEnvironment()` checks `DATABASE_URL` & `JWT_SECRET` | **PASS** |
| **Security Headers** | Helmet with CSP | Configured in `server/src/app.js` | **PASS** |
| **CORS Policy** | Multi-origin CSV | Configured via `CLIENT_URL` | **PASS** |
| **Rate Limiter** | 100 req / 15 min | Active on `/api/auth/login` and `/api/auth/register` | **PASS** |
| **Request Timeout** | 30-second cap | HTTP 504 Gateway Timeout middleware | **PASS** |
| **Error Masking** | Sanitize 500 errors | Non-revealing generic messages in production | **PASS** |
| **Graceful Shutdown**| `SIGTERM` / `SIGINT` | Stops reminder worker and terminates HTTP connections | **PASS** |

---

## 2. HEALTH CHECK ENDPOINT PROBING

The backend provisions dual healthcheck endpoints:
- `GET /health` (Standard container orchestrator probe path)
- `GET /api/health` (Application API probe path)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-11-09T08:45:00.000Z",
  "service": "EventHub Backend API",
  "uptime": 3600.2,
  "environment": "production"
}
```

---

## 3. DEPLOYMENT INSTRUCTIONS FOR CLOUD BACKEND (RAILWAY / RENDER)

1. **Deploy Command**: Push repo to GitHub; link repository in Railway or Render.
2. **Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=postgresql://user:pass@host:5432/eventhub_production?schema=public&sslmode=require&connection_limit=20&pool_timeout=10
   JWT_SECRET=GENERATED_64_CHAR_HEX_SECRET
   CLIENT_URL=https://eventhub.vercel.app
   ```
3. **Build Command**: `npm ci && npm run prisma:generate:pg && npm run prisma:deploy:pg`
4. **Start Command**: `node src/server.js`

**Classification:** **STAGING DEPLOYMENT VERIFIED**

