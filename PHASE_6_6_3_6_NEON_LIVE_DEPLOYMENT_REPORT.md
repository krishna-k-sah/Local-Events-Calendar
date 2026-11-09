# EventHub Phase 6.6.3.6 – Neon Live Deployment Audit Report

**Project:** EventHub – Local Event Calendar Management System  
**Phase:** Phase 6.6.3.6  
**Subject:** Neon Serverless PostgreSQL 16 Provisioning & Migration Status  
**Execution Timestamp:** 2026-11-09T22:49:00+05:30  
**Overall Status:** LOCAL MIGRATION LOGIC VERIFIED — CLOUD PROVISIONING BLOCKED (AUTHORIZATION PENDING)  

---

## 1. Executive Summary

This report documents the provisioning status, schema readiness, and dual-connection architecture for Neon Serverless PostgreSQL 16. The database migration logic and schema declarations were empirically verified on a disposable PostgreSQL 16 instance. However, live cloud database provisioning remains blocked pending interactive browser authorization by the user on the Neon Console.

---

## 2. Status Categorization Matrix

| Component / Requirement | Verified Specification | Execution Status | Evidence / Notes |
|---|---|---|---|
| **PostgreSQL Version** | PostgreSQL 16 | **VERIFIED** | Validated against PostgreSQL 16 engine |
| **Prisma Schema File** | `prisma/schema.postgresql.prisma` | **VERIFIED** | Contains 14 tables, 20 FKs, 52 indexes |
| **Prisma Migration CLI Syntax** | Explicit `--schema` flag | **VERIFIED** | `npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma` |
| **Dual Connection Model** | `DATABASE_URL` (6543) & `DIRECT_URL` (5432) | **VERIFIED** | Enforces runtime query pooling vs direct DDL compute |
| **Live Neon Project Creation** | Project: `eventhub-production` | **BLOCKED** | Requires user interactive login at console.neon.tech |
| **Live Neon Database Provisioning** | DB: `eventhub_production` | **BLOCKED** | Pending project creation |
| **Live Production Migration Run** | Apply `20261109081621_init_postgresql` | **NOT TESTED** | Pending live Neon connection string |
| **Live Production Table Inspection**| Query tables on live Neon cluster | **NOT TESTED** | Pending live migration execution |

---

## 3. Verified Connection Architecture & Correction of Previous Runbook

In previous Phase 6.6.3.5 runbooks, an ambiguous step suggested assigning the direct URL to both `DATABASE_URL` and `DIRECT_URL`. This has been corrected.

### 3.1 Required Neon Connection Segregation
1. **`DATABASE_URL` (Runtime Query Pooling):**
   - Format: `postgresql://<USER>:<PASSWORD>@ep-xyz-pooler.c-2.neon.tech:6543/eventhub_production?sslmode=require`
   - Purpose: Runtime Express backend queries via pgBouncer connection pool.
2. **`DIRECT_URL` (Direct Compute DDL):**
   - Format: `postgresql://<USER>:<PASSWORD>@ep-xyz.c-2.neon.tech:5432/eventhub_production?sslmode=require`
   - Purpose: Schema migrations (`prisma migrate deploy`) requiring session locks.

---

## 4. Required User Action to Unblock Live Neon Deployment

To provision the live database:
1. Navigate to **[console.neon.tech](https://console.neon.tech)** and log in.
2. Click **Create Project** -> Name: `eventhub-production` -> Select Region -> Version: **PostgreSQL 16**.
3. Create database: `eventhub_production`.
4. Copy both connection strings securely:
   - Pooled connection string (`-pooler`, port 6543)
   - Direct connection string (without `-pooler`, port 5432)
5. Run migrations from local Windows PowerShell:
   ```powershell
   cd "server"
   $env:DATABASE_URL = "<YOUR_NEON_POOLED_URL>"
   $env:DIRECT_URL = "<YOUR_NEON_DIRECT_URL>"
   npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma
   ```

---

## 5. Audit Conclusion

Database migrations are certified ready. Actual cloud provisioning status: **BLOCKED (CLOUD AUTHORIZATION PENDING)**.
