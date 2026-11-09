# PHASE 6.6.3.2 — NEON PRODUCTION DATABASE REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.2  
**Database Provider:** Neon Serverless PostgreSQL 16  
**Recommended Project Identifier:** `eventhub-production`  
**Recommended Database Identifier:** `eventhub_production`  
**Prisma ORM Version:** `5.22.0`  
**Status:** **SCHEMA VERIFIED & PREPARED — PENDING CLOUD PROVISIONING**

---

## 1. Verification State Breakdown

- [x] **Verified Locally:** Prisma PostgreSQL schema validated, dual connection (`url` + `directUrl`) configured, 14 relational models defined, migration SQL generated.
- [ ] **Pending User Authorization:** Neon web console account login and database project provisioning.
- [ ] **Pending Cloud Execution:** Direct-connection execution of `npx prisma migrate deploy`.
- [ ] **Not Tested:** Live connection to Neon cloud endpoints.

---

## 2. Connection Architecture

In [`server/prisma/schema.postgresql.prisma`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/prisma/schema.postgresql.prisma#L5-L9):
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

1. **`DATABASE_URL` (Runtime Application Traffic):**
   - Connects through Neon's connection pooler (`ep-*-pooler.*.aws.neon.tech`).
   - Uses pgBouncer transaction mode with SSL.
   - Manages connection scaling for high-concurrency Express queries.
2. **`DIRECT_URL` (Prisma DDL Migrations):**
   - Connects directly to Neon's PostgreSQL compute node (`ep-*.*.aws.neon.tech`).
   - Bypasses pgBouncer to allow transactional DDL, advisory locking, and migration tracking.

---

## 3. Production Migration Runbook (PowerShell)

Execute immediately once connection strings are obtained from the Neon dashboard:
```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"
$env:DATABASE_URL="<neon-pooled-url>"
$env:DIRECT_URL="<neon-direct-url>"
node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.postgresql.prisma
```

*Expected Verification Output:*
```
14 migrations applied
The PostgreSQL database is now in sync with the schema.
```

---

## 4. Live Verification SQL Checklist

Execute against the direct connection after migration:
- `SELECT version();` -> PostgreSQL 16.x
- `SELECT current_database();` -> `eventhub_production`
- `SELECT tablename FROM pg_tables WHERE schemaname = 'public';` -> 14 application tables
- `SELECT count(*) FROM "_prisma_migrations" WHERE rolled_back_at IS NULL;` -> 1 active migration
- `SHOW ssl;` -> `on`
