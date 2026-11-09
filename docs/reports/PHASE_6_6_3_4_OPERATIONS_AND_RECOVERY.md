# EventHub Phase 6.6.3.4 – Operations & Recovery Guide

**Project:** EventHub – Local Event Calendar Management System  
**Audit Phase:** Phase 6.6.3.4  
**Date:** 2026-11-09  
**Scope:** Backup verification, disaster recovery, schema migration runbook, and health monitoring  

---

## 1. Verified Database Backup and Test Restore Procedure

In Phase 6.6.3.4, an empirical database backup and restore test was executed against the PostgreSQL database.

### 1.1 Execution Evidence & Results
- **Source Database:** `eventhub_phase54_test`
- **Backup Format:** PostgreSQL custom archive (`pg_dump -F c`)
- **Restoration Target:** Temporary verification database `eventhub_restore_verify`
- **Automated Verification Script:** `scripts/verify_backup_restore.mjs`
- **Result:** **100% data parity verified across all 13 schema models:**

| Model | Original Record Count | Restored Record Count | Parity Status |
|---|---|---|---|
| `Role` | 3 | 3 | **PASS (100%)** |
| `User` | 1,480 | 1,480 | **PASS (100%)** |
| `Category` | 8 | 8 | **PASS (100%)** |
| `Location` | 8 | 8 | **PASS (100%)** |
| `Event` | 260 | 260 | **PASS (100%)** |
| `Registration` | 1,119 | 1,119 | **PASS (100%)** |
| `Favorite` | 11 | 11 | **PASS (100%)** |
| `Notification` | 591 | 591 | **PASS (100%)** |
| `EventImage` | 0 | 0 | **PASS (100%)** |
| `ActivityLog` | 1,362 | 1,362 | **PASS (100%)** |
| `Waitlist` | 207 | 207 | **PASS (100%)** |
| `Attendance` | 251 | 251 | **PASS (100%)** |
| `EventReminder` | 81 | 81 | **PASS (100%)** |

---

## 2. Production Backup and Disaster Recovery Runbook

### 2.1 Automated Cloud Backups (Neon PostgreSQL)
Neon automatically creates continuous Point-In-Time Recovery (PITR) WAL logs and daily snapshots with zero downtime.
- **RPO (Recovery Point Objective):** < 5 minutes (WAL streaming).
- **RTO (Recovery Time Objective):** < 15 minutes (instant branch creation from snapshot).

### 2.2 Manual On-Demand Production Backup
To create an on-demand point-in-time snapshot of the cloud database:
```powershell
pg_dump --dbname="<DIRECT_URL>" -F c -f "backups/eventhub_prod_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"
```

### 2.3 Production Disaster Recovery Procedure
In the event of database corruption or catastrophic data loss:
1. Provision a fresh Neon database or restore to a previous timeline branch via the Neon console.
2. If restoring from custom dump:
   ```powershell
   pg_restore --clean --if-exists --no-owner --dbname="<NEW_DIRECT_URL>" "backups/eventhub_prod_XXXX.dump"
   ```
3. Update `DATABASE_URL` and `DIRECT_URL` environment variables in Railway.
4. Redeploy Railway backend container to establish connections.

---

## 3. Database Migration Runbook

For applying future schema migrations to production:
1. Always apply migrations using the direct compute URL (`DIRECT_URL`):
   ```powershell
   cd server
   $env:DATABASE_URL = "<DIRECT_URL>"
   npx prisma migrate deploy
   ```
2. Validate migration status:
   ```powershell
   npx prisma migrate status
   ```
3. Never run `prisma migrate dev` or `prisma db push --force-reset` against production.

---

## 4. Production Health Monitoring and Incident Response

### 4.1 Liveness & Readiness Probes
- **Endpoint:** `GET /health`
- **Normal Response:** HTTP 200 OK
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-11-09T16:42:00.000Z",
    "database": "connected",
    "uptime": 1420.5
  }
  ```
- **Degraded Response:** HTTP 503 Service Unavailable if database connection fails.

### 4.2 Triaging Common Production Incidents
1. **HTTP 503 on Backend:**
   - Check Railway deploy logs.
   - Verify Neon PostgreSQL compute status (ensure compute did not exceed scale-to-zero timeout during cold starts).
2. **CORS Errors on Frontend:**
   - Verify `CLIENT_URL` in Railway matches the exact Vercel production domain without trailing slash.
3. **Database Connection Limit Exceeded:**
   - Ensure Railway `DATABASE_URL` points to the pooled port (6543 with `-pooler` in domain), NOT the direct compute port.
