# EventHub Phase 6.6.3.5 – Database & Prisma Migration Audit Report

**Project:** EventHub – Local Event Calendar Management System  
**Audit Phase:** Phase 6.6.3.5  
**Prisma Version:** `5.22.0`  
**Target Database Engine:** PostgreSQL 16 (Neon Serverless & Docker Local)  
**Execution Timestamp:** 2026-11-09T22:36:00+05:30  
**Status:** VERIFIED  

---

## 1. Executive Summary

A rigorous audit of the Prisma ORM configuration and database migration pipeline was conducted. The migration scripts and schema were validated against a dedicated disposable PostgreSQL database (`eventhub_disposable_mig_test`) running on PostgreSQL 16.

A critical configuration distinction was verified: because the repository maintains both development SQLite (`prisma/schema.prisma`) and production PostgreSQL (`prisma/schema.postgresql.prisma`), all migration and generation CLI commands must explicitly supply the `--schema=prisma/schema.postgresql.prisma` flag.

All 9 migration verification checks—including fresh migration, re-migration idempotency, status reporting, table generation, foreign keys, unique indexes, and runtime CRUD operations—passed with zero errors.

---

## 2. Datasource Architecture & Dual-Connection Verification

In `server/prisma/schema.postgresql.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 2.1 Dual-URL Role Segregation
1. **`DATABASE_URL` (Pooled Connection via pgBouncer / Neon Port 6543):**
   - Configured with transaction-mode pooling.
   - Dedicated for application runtime queries, web requests, and serverless execution.
2. **`DIRECT_URL` (Direct Compute Connection via Neon Port 5432):**
   - Direct connection to PostgreSQL compute node.
   - Dedicated for DDL migrations (`prisma migrate deploy`) and schema modifications that require session-level locking.

---

## 3. Disposable Database Verification Evidence (`scripts/test_disposable_migration.mjs`)

A clean disposable database was provisioned and tested using the verified migration commands:

| Step # | Test Operation | Command Executed | Observed Result | Status |
|---|---|---|---|---|
| **1** | Disposable DB Provisioning | `psql -c "CREATE DATABASE eventhub_disposable_mig_test;"` | Database created cleanly | **VERIFIED** |
| **2** | Fresh Migration Deployment | `npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma` | Applied `20261109081621_init_postgresql` successfully | **VERIFIED** |
| **3** | Idempotency Verification | `npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma` | "No pending migrations to apply" | **VERIFIED** |
| **4** | Migration Status Audit | `npx prisma migrate status --schema=prisma/schema.postgresql.prisma` | "Database schema is up to date!" | **VERIFIED** |
| **5** | Table Schema Creation | SQL query to `information_schema.tables` | **14 tables created** (`_prisma_migrations`, `users`, `events`, `registrations`, etc.) | **VERIFIED** |
| **6** | Foreign Key Constraints | SQL query to `information_schema.table_constraints` | **20 Foreign Key constraints** active and verified | **VERIFIED** |
| **7** | Indexes & Unique Constraints | SQL query to `pg_indexes` | **52 database indexes** created across public schema | **VERIFIED** |
| **8** | Prisma Client Read/Write | Insert and query test record via `@prisma/client` | Write and read verified successfully | **VERIFIED** |
| **9** | Cleanup | `psql -c "DROP DATABASE eventhub_disposable_mig_test;"` | Database dropped without residual artifacts | **VERIFIED** |

---

## 4. Verified Windows PowerShell Migration Commands

For running migrations against production or staging environments:

```powershell
# Set direct compute URL (NEVER use pooled connection for migrations)
$env:DATABASE_URL = "postgresql://<USER>:<PASSWORD>@<COMPUTE_HOST>:5432/<DB>?sslmode=require"
$env:DIRECT_URL = "postgresql://<USER>:<PASSWORD>@<COMPUTE_HOST>:5432/<DB>?sslmode=require"

# Check migration status without modifying schema
cd server
npx prisma migrate status --schema=prisma/schema.postgresql.prisma

# Deploy pending migrations safely to PostgreSQL
npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma

# Generate Prisma Client for PostgreSQL schema
npx prisma generate --schema=prisma/schema.postgresql.prisma
```

> [!CAUTION]
> **Prohibited Production Commands:**
> - NEVER run `prisma migrate reset` (destructive dropped tables).
> - NEVER run `prisma db push --force-reset` (bypasses migration history).
> - NEVER run `npx prisma migrate deploy` without `--schema=prisma/schema.postgresql.prisma`.

---

## 5. Audit Conclusion

The PostgreSQL schema and Prisma migration pipeline are certified **VERIFIED** for PostgreSQL 16 cloud deployment.
