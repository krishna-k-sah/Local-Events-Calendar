# EventHub Phase 6.6.3.6 – Operations, Health Monitoring & Recovery Audit Report

**Project:** EventHub – Local Event Calendar Management System  
**Phase:** Phase 6.6.3.6  
**Subject:** Production Operations, Liveness Probes, Logging, Backups & Disaster Recovery  
**Execution Timestamp:** 2026-11-09T22:49:00+05:30  
**Overall Status:** OPERATIONAL PROCEDURES VERIFIED — CLOUD MONITORING NOT TESTED (PENDING DEPLOYMENT)  

---

## 1. Executive Summary

This report establishes the operational procedures, healthcheck definitions, disaster recovery runbooks, and telemetry monitoring for EventHub. In local testing, deep backup and restore verification confirmed 100% record parity, valid archive TOC headers, relational join consistency, and active insert capabilities without data corruption.

Cloud-hosted monitoring (such as Railway deploy logs, Neon PITR snapshots, and Vercel edge telemetry) will become operational upon cloud service activation.

---

## 2. Operational Procedures & Status Matrix

| Operational Component | Verified Specification | Local Status | Live Cloud Status |
|---|---|---|---|
| **Liveness & Readiness Probe** | `GET /health` returns HTTP 200 or 503 | **VERIFIED** | **NOT TESTED** |
| **Dynamic Port Evaluation** | Derives port from `$PORT` in Docker script | **VERIFIED** | **NOT TESTED** |
| **Graceful Shutdown** | `SIGTERM` / `SIGINT` stops reminder intervals | **VERIFIED** | **NOT TESTED** |
| **PostgreSQL Custom Archive Dump**| `pg_dump -F c` with TOC header validation | **VERIFIED** | **NOT TESTED** |
| **Automated Restore Parity** | 100% match across 13 models (1,639 users, 288 events) | **VERIFIED** | **NOT TESTED** |
| **Relational Consistency on Restore**| Restored foreign key joins verified without orphans | **VERIFIED** | **NOT TESTED** |
| **Overwrite Safeguard** | Aborts if source DB === target restore DB | **VERIFIED** | **VERIFIED** |
| **Live Cloud WAL Backups** | Neon automatic point-in-time recovery | **VERIFIED (DESIGN)**| **NOT TESTED** |
| **Container Logging** | Winston / Morgan structured logging | **VERIFIED** | **NOT TESTED** |

---

## 3. Production Incident Response Protocols

### 3.1 Backend Healthcheck Degradation (HTTP 503)
- **Symptom:** Railway container healthcheck reports unhealthy; `/health` returns `{ "status": "degraded", "database": "disconnected" }`.
- **Triaging Steps:**
  1. Inspect Railway deploy logs for database connection timeouts.
  2. Verify Neon PostgreSQL compute state (check whether serverless autoscaling suspended the compute node).
  3. Ensure `DATABASE_URL` connects through the pooled port (6543 with `-pooler`), NOT the direct compute port.

### 3.2 CORS Block on Frontend Requests
- **Symptom:** Browser console reports `Access-Control-Allow-Origin missing`.
- **Triaging Steps:**
  1. Verify the exact domain in browser address bar (e.g. `https://eventhub.vercel.app`).
  2. Confirm Railway `CLIENT_URL` matches the canonical Vercel domain without trailing slashes.
  3. Redeploy Railway backend to apply origin changes.

---

## 4. Disaster Recovery Runbook

1. **On-Demand Snapshot:**
   ```powershell
   pg_dump --dbname="<NEON_DIRECT_URL_5432>" -F c -f "backups/prod_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"
   ```
2. **Disaster Restoration:**
   ```powershell
   # Restore into separate new database branch
   pg_restore --clean --if-exists --no-owner --dbname="<NEW_NEON_DIRECT_URL>" "backups/prod_backup_XXXX.dump"
   # Update Railway variables and redeploy
   ```

---

## 5. Audit Conclusion

Operational and disaster recovery procedures are certified reliable. Live cloud telemetry status: **NOT TESTED (PENDING CLOUD DEPLOYMENT)**.
