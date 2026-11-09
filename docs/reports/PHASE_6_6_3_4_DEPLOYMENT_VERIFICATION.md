# EventHub Phase 6.6.3.4 – Deployment Verification Report

**Project:** EventHub – Local Event Calendar Management System  
**Target Architecture:** Vercel (Frontend SPA) + Railway (Backend Container) + Neon (Serverless PostgreSQL 16)  
**Deployment Strategy:** Direct local deployment from Windows project (GitHub integration explicitly deferred)  
**Verification Date:** 2026-11-09  
**Status:** CONFIGURATION VERIFIED — CLOUD AUTHORIZATION PENDING  

---

## 1. Cloud Architecture Specifications

```
  +-------------------------------------------------------------------+
  |                      PUBLIC INTERNET / USERS                      |
  +-------------------------------------------------------------------+
                                   |
                                   v
             [ Vercel CDN Edge Network (SSL / TLS 1.3) ]
             Frontend: React 18 + Vite SPA (Client Chunks)
             Config: client/vercel.json (SPA rewrite to /index.html)
                                   |
                     API Requests (/api/*) via HTTPS
                                   v
          [ Railway Container Platform (Docker Alpine Node 20) ]
          Backend: Express REST API + Prisma 5.22.0
          Config: server/Dockerfile + server/docker-healthcheck.sh
          Dynamic Port Binding: ${PORT:-5000}
                                   |
             Pooled (6543) / Direct DDL (5432) TLS Connections
                                   v
               [ Neon Serverless PostgreSQL 16 Cluster ]
               Multi-AZ Replication, Auto-Suspending Compute
```

---

## 2. Configuration Artifact Verification

### 2.1 Vercel Frontend Configuration (`client/vercel.json`)
- **Rewrite Rules:** Explicitly routes all non-static paths `/(.*)` to `/index.html` to guarantee client-side React Router navigation.
- **Cache Headers:** Caches immutable hashed assets under `/assets/*` with `max-age=31536000, immutable`.
- **Environment Variable Contract:** Requires `VITE_API_URL` pointing to the deployed Railway backend.

### 2.2 Railway Backend Configuration (`server/Dockerfile`)
- **Base Image:** `node:20-alpine` (multi-stage build with `openssl`).
- **Port Flexibility:** Listens on environment-supplied `$PORT` dynamically.
- **Healthcheck Script:** `server/docker-healthcheck.sh` queries `/health` with exit code 0 on healthy response.
- **Security:** Runs as non-root user `node`. Excludes all local development databases and env files via `.dockerignore`.

### 2.3 Neon PostgreSQL Configuration (`server/prisma/schema.postgresql.prisma`)
- **Dual URL Setup:**
  - `DATABASE_URL`: Connection pooled URL (`...-pooler.neon.tech:6543/...`) for high-concurrency runtime queries.
  - `DIRECT_URL`: Compute URL (`...neon.tech:5432/...`) for DDL schema migrations via `npx prisma migrate deploy`.

---

## 3. Cloud Provider Authentication Audit

To comply with non-interactive execution constraints, a credential audit was performed on the local Windows environment:
- **Vercel CLI Token:** No cached credentials detected at `$env:APPDATA\com.vercel.cli`.
- **Railway CLI Token:** No cached credentials detected at `$env:LOCALAPPDATA\railway` or `$env:USERPROFILE\.railway`.
- **Neon Cloud Token:** No API token pre-injected in environment variables.

Because cloud providers require interactive browser OAuth authorization for account connection and billing association, direct provisioning requires user-driven OAuth login.

---

## 4. GitHub Deferral Compliance

In strict compliance with user instructions:
- No remote Git repository (`git remote`) was configured.
- No branches were pushed to GitHub.
- All deployment scripts, Dockerfiles, and configuration files are prepared for direct deployment from the local Windows workspace.

---

## 5. Deployment Verification Status

All configuration files, build processes, and containerization artifacts are verified and ready for cloud activation upon user-supplied authorization.
