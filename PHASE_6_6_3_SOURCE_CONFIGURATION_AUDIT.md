# PHASE 6.6.3 — SOURCE CONFIGURATION & DEPLOYMENT AUDIT REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Current Release:** 6.6.2  
**Target Release:** 6.6.3  
**Audit Timestamp:** 2026-11-09T21:22:00+05:30  
**Branch:** `master`  
**Latest Baseline Commit:** `3268c37`  
**Auditors:** Senior DevOps Engineer, Cloud Deployment Architect, Backend Engineer & Security Auditor  

---

## 1. Executive Summary

A comprehensive source code and deployment configuration audit was executed on the EventHub codebase. The audit inspected the application entry points, dependency trees, schema configurations, containerization manifests, build pipelines, health endpoints, and environment variable bindings. All six core deployment questions were resolved against actual source files, and necessary adjustments (URL normalization in `api.js`, `directUrl` in `schema.postgresql.prisma`, dynamic port in Dockerfile `HEALTHCHECK`, and `server/railway.json`) have been applied and validated.

---

## 2. Answers to the Six Mandatory Deployment Questions

### 1. Which environment variable does the frontend use for its backend API URL?
- **Source File:** [`client/src/services/api.js`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/client/src/services/api.js#L3-L9)
- **Environment Variables Checked:**
  ```javascript
  const rawBaseURL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';
  ```
- **Finding:** The application accepts either `VITE_API_BASE_URL` or `VITE_API_URL` (with fallback to relative `'/api'` in local development with Vite proxy).
- **Critical Architectural Enhancement:** Because client services make requests to `/events`, `/auth/login`, etc., setting `VITE_API_URL` to `https://<backend-domain>` without `/api` would cause 404s. `client/src/services/api.js` was enhanced to automatically normalize the baseURL:
  ```javascript
  const normalizedBaseURL = rawBaseURL.replace(/\/+$/, '').endsWith('/api')
    ? rawBaseURL.replace(/\/+$/, '')
    : `${rawBaseURL.replace(/\/+$/, '')}/api`;
  ```
  This guarantees that regardless of whether the environment variable includes a trailing slash or omits `/api`, requests always route cleanly to `/api/...`.

### 2. Which environment variable controls backend CORS?
- **Source Files:** [`server/src/app.js`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/src/app.js#L39-L62), [`server/src/config/envValidator.js`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/src/config/envValidator.js#L28-L30)
- **Environment Variable:** `CLIENT_URL`
- **Implementation:** Supports both a single origin (e.g. `https://eventhub.vercel.app`) and a comma-separated list of origins. In development and staging, it automatically includes `http://localhost:5173` and `http://127.0.0.1:5173`. Non-browser requests (e.g. curl, uptime monitors, server-to-server) without an `Origin` header are permitted.

### 3. Does the backend read Railway's dynamically assigned PORT?
- **Source File:** [`server/src/server.js`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/src/server.js#L10-L15)
- **Implementation:**
  ```javascript
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, '0.0.0.0', ...);
  ```
- **Finding:** The backend dynamically binds to `process.env.PORT` and listens on `0.0.0.0` (all network interfaces).
- **Docker & Railway Alignment:** In [`server/Dockerfile`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/Dockerfile#L40-L41), the container healthcheck command was updated from hardcoded `5000` to `http://127.0.0.1:${PORT:-5000}/health` to ensure Docker and Railway internal probes succeed when Railway assigns a dynamic port.

### 4. Does Prisma use DATABASE_URL, DIRECT_URL, or another migration configuration?
- **Source File:** [`server/prisma/schema.postgresql.prisma`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/prisma/schema.postgresql.prisma#L5-L9)
- **Implementation:**
  ```prisma
  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
  }
  ```
- **Finding:** 
  - `DATABASE_URL`: Used for application runtime traffic via Neon's connection pooler (`-pooler` endpoint, pgBouncer).
  - `DIRECT_URL`: Used by Prisma CLI for migrations (`npx prisma migrate deploy`) connecting directly to PostgreSQL compute, bypassing pgBouncer transaction limits.

### 5. Does production startup automatically execute migrations?
- **Source Files:** [`server/package.json`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/package.json#L8), [`server/Dockerfile`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/Dockerfile#L43)
- **Implementation:** `CMD ["node", "src/server.js"]`
- **Finding:** No. Production startup does not automatically run migrations. Following cloud-native 12-factor principles, database migrations must be executed independently prior to container rollout (`npm run prisma:deploy:pg` / `npx prisma migrate deploy`) to avoid race conditions and lock contention across multiple container instances.

### 6. Does Docker start the correct application entry point?
- **Source Files:** [`server/Dockerfile`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/Dockerfile#L43), [`server/package.json`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/package.json#L5)
- **Implementation:** `CMD ["node", "src/server.js"]` which matches `"main": "src/server.js"`.
- **Finding:** Yes. Docker invokes `src/server.js`, which runs environment validation, boots Express on `0.0.0.0:${PORT}`, and initiates the background reminder worker.

---

## 3. Package & Manifest Audit

### Frontend (`client/package.json`)
- **Version:** `1.0.0` (Vite 5.4.11 / React 18.3.1 / React Router DOM 6.28.1 / Tailwind CSS 3.4.17)
- **Build Script:** `vite build`
- **Asset Routing:** Configured via [`client/vercel.json`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/client/vercel.json) with rewrite rule `"source": "/(.*)", "destination": "/index.html"` and 1-year immutable caching for static chunks.

### Backend (`server/package.json`)
- **Version:** `1.0.0` (Node.js 20+ ES Modules)
- **Prisma CLI / Client:** `5.22.0`
- **Core Dependencies:** Express 4.21.2, Helmet 8.0.0, CORS 2.8.5, jsonwebtoken 9.0.2, bcryptjs 2.4.3, express-rate-limit 7.5.0, morgan 1.10.0.
- **Migration Script:** `prisma:deploy:pg` -> `prisma migrate deploy --schema=prisma/schema.postgresql.prisma`

---

## 4. Container & Cloud Deployment Files

1. **[`server/Dockerfile`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/Dockerfile):**
   - Multi-stage build based on `node:20-alpine`.
   - Dedicated unprivileged system user `appuser` (UID: 10001) in group `appgroup`.
   - Build-stage offline Prisma Client generation (`npx prisma generate`).
   - Dynamic port healthcheck: `wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-5000}/health`.
2. **[`server/railway.json`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/railway.json):**
   - Declarative specification setting builder to `DOCKERFILE` (`Dockerfile`), start command `node src/server.js`, and healthcheck `/health`.
3. **[`client/vercel.json`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/client/vercel.json):**
   - SPA rewrite rules guaranteeing clean navigation and page refreshes on nested routes without 404s.

---

## 5. Security & Health Endpoints

- **Environment Validation:** [`server/src/config/envValidator.js`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/src/config/envValidator.js) validates `DATABASE_URL`, enforces `JWT_SECRET` length $\ge 32$ and rejects development secrets in production/staging.
- **Health Endpoints:** Both `/health` and `/api/health` execute a live database probe (`SELECT 1`).
  - Healthy response (HTTP 200): `{"status": "healthy", "database": "connected", "uptime": ...}`
  - Unhealthy response (HTTP 503): `{"status": "degraded", "database": "disconnected", "error": ...}`

---

## 6. Audit Conclusion

All application configurations and manifests are synchronized and certified for cloud activation.

