# PHASE 6: PRODUCTION READINESS AUDIT REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Principal Software Architect, Application Security Engineer & DevOps Lead  
**Date:** November 2026  
**Audit Target:** EventHub Release Candidate 3 (RC3) Codebase  
**Overall Readiness Rating:** **CONDITIONALLY READY** (Targeted Hardening Required Before Public Launch)  

---

## 1. EXECUTIVE AUDIT SUMMARY

An exhaustive line-by-line inspection was performed across the complete EventHub repository, including:
- **Frontend**: React 18, Vite 5, Tailwind CSS, React Router 6, FullCalendar, Recharts, Lucide Icons.
- **Backend**: Node.js 24, Express 4.21, Prisma ORM 5.22, Helmet 8, Morgan, Rate Limiting, Multer.
- **Database**: PostgreSQL 16 (Relational schema, 14 tables, row-level concurrency locking).
- **Security & RBAC**: JWT (HMAC-SHA256), bcrypt (10 rounds), role-based middleware (`ADMIN`, `ORGANIZER`, `ATTENDEE`).
- **Background Automation**: Automated event reminder scheduler with lease timeouts and crash recovery.

The codebase is structurally sound, with 113/113 automated tests passing. However, ten specific production configuration gaps, security risks, and deployment bottlenecks were identified that must be resolved prior to public release.

---

## 2. DETAILED AUDIT FINDINGS (10 CORE CATEGORIES)

### 2.1 Production Configuration Gaps
- **Finding**: The backend lacks runtime schema validation for critical environment variables at bootstrap.
- **Risk**: A missing `DATABASE_URL` or misconfigured `JWT_SECRET` causes silent degraded runtime operations or crashes midway through request execution.
- **Remediation**: Implement an early startup validation assertion in [server.js](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/src/server.js) that verifies all mandatory environment variables before binding the HTTP port.

### 2.2 Missing Environment Variables & Drift
- **Finding**: In [api.js](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/client/src/services/api.js), `baseURL` references `VITE_API_BASE_URL`, whereas [client/.env.example](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/client/.env.example) documented `VITE_API_URL`.
- **Risk**: If DevOps sets `VITE_API_URL` during CI build, Vite falls back to the default `/api`, breaking communication if the backend is hosted on a separate subdomain or domain.
- **Remediation**: Harmonize both client variables by supporting `VITE_API_BASE_URL || VITE_API_URL || '/api'`.

### 2.3 Hardcoded Development Settings & Insecure Defaults
- **Finding**: In [jwt.js](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/src/config/jwt.js), a default fallback secret `eventhub-super-secret-jwt-key-2026-production` is present. While it logs an error in production, it does not terminate the process.
- **Risk**: A production server started without `JWT_SECRET` would sign tokens using a known public default secret, allowing arbitrary JWT forgery.
- **Remediation**: Fail fast on startup with `process.exit(1)` if `NODE_ENV === 'production'` and `JWT_SECRET` is unset, default, or fewer than 32 characters.

### 2.4 Missing Security Headers & CSP
- **Finding**: [app.js](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/src/app.js) enables `helmet({ crossOriginResourcePolicy: false })` but does not define a Content Security Policy (CSP), HTTP Strict Transport Security (HSTS) with subdomains, or Permissions-Policy.
- **Risk**: Potential susceptibility to Cross-Site Scripting (XSS), clickjacking, or data exfiltration in production browsers.
- **Remediation**: Configure comprehensive Helmet policies with standard HSTS headers and secure cross-origin resource sharing policies.

### 2.5 CORS Configuration Flaws
- **Finding**: `cors` middleware in [app.js](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/src/app.js) accepts only a single string in `process.env.CLIENT_URL`.
- **Risk**: In staging and production, traffic may originate from multiple origins (e.g. `https://eventhub.com`, `https://www.eventhub.com`, and preview URLs).
- **Remediation**: Parse `CLIENT_URL` as a comma-separated list and dynamically match incoming request origins.

### 2.6 Database Connection Risks & Pooling
- **Finding**: [db.js](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/src/config/db.js) initializes `new PrismaClient()` without explicit connection limit and timeout parameters.
- **Risk**: Under high concurrent load or multiple container replicas, PostgreSQL connection limits ($100$ default) can be rapidly exhausted, leading to `503 Service Unavailable`.
- **Remediation**: Enforce connection pool parameters (`connection_limit=20&pool_timeout=10`) in the production connection string.

### 2.7 Missing Production Error Sanitization
- **Finding**: In [errorHandler.js](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/src/middleware/errorHandler.js), `err.message` is returned to the client whenever an error occurs.
- **Risk**: Internal PostgreSQL connection exceptions, SQL syntax errors, or table schemas could be exposed to public API consumers in the JSON response payload.
- **Remediation**: In production mode (`NODE_ENV === 'production'`), sanitize all 500 Internal Server Error responses to a standard message (`"An unexpected internal server error occurred"`), while retaining structured server-side logging.

### 2.8 Logging Deficiencies
- **Finding**: `morgan('dev')` is active only in non-test mode, producing ANSI-colored single-line text output suited for terminal debugging but ill-suited for centralized log aggregators (Datadog, CloudWatch, Logflare).
- **Risk**: Inability to parse structured request metrics, latency percentiles, or user IDs from production container logs.
- **Remediation**: Implement structured JSON access logging in production mode.

### 2.9 Ephemeral File Upload Storage
- **Finding**: Multer in [upload.js](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/src/middleware/upload.js) stores uploaded event posters on local filesystem disk at `server/uploads/`.
- **Risk**: Modern cloud platforms (Render, Railway, Fly.io, Vercel) utilize ephemeral container filesystems. Any file uploaded to local disk will be wiped upon container restart or deployment, and will not be shared across multiple horizontal instances.
- **Remediation**: Document cloud storage integration (AWS S3 / Cloudflare R2 / Google Cloud Storage) and configure persistent volume mounts for self-hosted container environments.

### 2.10 SPA Client-Side Routing Fallback
- **Finding**: The frontend relies on React Router with HTML5 History API (`browserRouter`).
- **Risk**: Direct navigation or page refreshes on non-root URLs (e.g., `/events/cmw8...` or `/dashboard`) on static hosting platforms (Vercel, Netlify, Cloudflare Pages, Nginx) will result in HTTP 404 Not Found unless rewrite rules are configured.
- **Remediation**: Provide deployment rewrite rules (`vercel.json`, `_redirects` for Netlify/Cloudflare, and `nginx.conf`).

---

## 3. AUDIT CLASSIFICATION MATRIX

| Component | Status | Identified Vulnerability / Gap | Severity | Required Action |
|---|---|---|---|---|
| **Environment Config** | **PARTIAL** | Missing startup schema assertion | Medium | Add startup env validator |
| **JWT Configuration** | **PARTIAL** | Soft warning on default secret | Critical | Enforce hard exit on invalid secret |
| **Error Handling** | **PARTIAL** | Raw `err.message` leak on 500s | High | Sanitize error output in production |
| **CORS Middleware** | **PARTIAL** | Single-origin restriction | Medium | Support multi-origin CSV array |
| **Client Routing** | **PARTIAL** | Missing SPA rewrite rules | High | Provide `vercel.json` & `_redirects` |
| **File Storage** | **PARTIAL** | Local filesystem storage | Medium | Provide volume / S3 configuration |
| **Security Headers** | **PARTIAL** | Basic Helmet without CSP | Medium | Strengthen CSP & HSTS |
| **Database Migrations**| **PASS** | Formal Prisma migrations applied | None | Ready for staging/prod deploy |
| **Concurrency Locking**| **PASS** | Row-level locking implemented | None | Certified in Phase 5.5 |
| **Automated Tests** | **PASS** | 113/113 passing | None | Full test coverage verified |

---

## 4. NEXT STEPS & REMEDIATION PLAN

1. Proceed to **Phase 2: Deployment Architecture Evaluation** to select optimal infrastructure for frontend, backend, and PostgreSQL.
2. Implement code-level remediations in Phase 3 & 5 (startup environment validation, error sanitization, multi-origin CORS, and SPA routing manifests).
3. Execute staging deployment and disaster recovery testing in Phases 7 & 9.

