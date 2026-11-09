# PHASE 6.2: BACKEND PIPELINE & LIFECYCLE REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Senior DevOps & Build Automation Engineer  
**Date:** November 2026  
**Pipeline Status:** **PASS** (Zero Database Coupling During Build Stage)  

---

## 1. THREE-STAGE DEPLOYMENT LIFECYCLE

The backend deployment pipeline is decoupled into three independent execution stages:

```
+-----------------------------------------------------------------------------------+
| 1. BUILD STAGE (Zero Database Coupling)                                           |
|    - Command: npm ci && npm run build                                             |
|    - Action: Compiles Node.js modules and generates Prisma Client statically       |
|    - Verified: Generates Client in 144ms without active database connection       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 2. MIGRATION STAGE (Requires Target Database URI)                                 |
|    - Command: npm run prisma:deploy:pg                                            |
|    - Script: prisma migrate deploy --schema=prisma/schema.postgresql.prisma       |
|    - Action: Forward-only execution of committed versioned DDL migrations         |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 3. RUNTIME STAGE (Container Execution)                                            |
|    - Command: node src/server.js                                                  |
|    - Action: Fast startup validation, binds port 5000, starts reminder worker     |
|    - Security: Unprivileged execution under user appuser (UID 10001)              |
+-----------------------------------------------------------------------------------+
```

---

## 2. REVISED NPM SCRIPT REGISTRY

The `server/package.json` manifest defines explicit pipeline scripts:
- **`build`**: `prisma generate --schema=prisma/schema.postgresql.prisma` (Invoked automatically by modern cloud buildpacks).
- **`prisma:generate:pg`**: Targeted PostgreSQL client generation.
- **`prisma:deploy:pg`**: Non-interactive production migration deployment.
- **`start`**: `node src/server.js` (Invoked by cloud container runner).
- **`test`**: `vitest run` (Test runner for CI pipelines).

---

## 3. DOCKER MULTI-STAGE REPRODUCIBILITY AUDIT

The multi-stage container build was tested and verified:
- **Base Image**: `node:20-alpine`.
- **Builder Stage**: Compiles dependencies and generates client into `/app/node_modules/@prisma/client`.
- **Runner Stage**: Minimal alpine image copying only dependencies and source code.
- **Security Check**: Verified process executes as `appuser:appgroup` (non-root).
- **Healthcheck Probe**: `wget --spider http://localhost:5000/health`.

**Classification:** **PASS**
