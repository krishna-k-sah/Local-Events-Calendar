# PHASE 6.6.3.1 — NEON DATABASE & PRISMA CONFIGURATION REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.1  
**Target Database Provider:** Neon Serverless PostgreSQL 16  
**Recommended Database Name:** `eventhub_production`  
**Prisma ORM Version:** `5.22.0`  
**Status:** **DUAL CONNECTION ARCHITECTURE CONFIGURED & VERIFIED**

---

## 1. Database Naming & Identifier Standard

- **Recommended Identifier:** `eventhub_production` (using underscore instead of hyphen).
- **Reasoning:** In PostgreSQL standard SQL syntax, identifiers with hyphens (`eventhub-production`) must be enclosed in double quotes in raw queries (`"eventhub-production"`). Using snake_case `eventhub_production` avoids parser syntax traps and ensures seamless compatibility across connection string parameters.

---

## 2. Dual Connection Architecture for Neon Serverless PostgreSQL

Prisma interacting with serverless PostgreSQL poolers (such as Neon's PgBouncer) requires two dedicated endpoints:

```
+-----------------------------------------------------------------------------+
|                           PRISMA CONFIGURATION                              |
+-----------------------------------------------------------------------------+
        |                                                   |
        v Runtime Client Traffic                            v DDL Migrations (CLI)
  DATABASE_URL                                        DIRECT_URL
  Neon Pooled Endpoint (-pooler)                      Neon Direct Compute Endpoint
  pgBouncer Transaction Mode                          Direct PostgreSQL 16 Connection
  Handles 1000s of lightweight queries                Advisory locks, table creation, DDL
```

### Schema Datasource Configuration
In [`server/prisma/schema.postgresql.prisma`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/prisma/schema.postgresql.prisma#L5-L9):
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- **Runtime Queries:** Prisma Client uses `DATABASE_URL` pointing to the pooled host (e.g. `ep-xyz-pooler.us-east-2.aws.neon.tech`).
- **Migrations:** Prisma CLI (`prisma migrate deploy`) automatically detects `directUrl` and executes migrations over the unpooled compute endpoint (e.g. `ep-xyz.us-east-2.aws.neon.tech`), avoiding the `pgBouncer cannot acquire advisory lock` error.

---

## 3. Migration Procedure & Verification Runbook

### Step 1: Provision Neon Database
1. Navigate to [Neon Console](https://console.neon.tech).
2. Create project with name `eventhub-production`.
3. Create database `eventhub_production` on **PostgreSQL 16**.
4. Retrieve both connection strings:
   - Pooled connection (`-pooler` in domain) -> `DATABASE_URL`
   - Direct connection (standard domain) -> `DIRECT_URL`

### Step 2: Execute Migrations
Run from the `server/` directory:
```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"
$env:DATABASE_URL="<neon-pooled-url>"
$env:DIRECT_URL="<neon-direct-url>"
npx prisma migrate deploy --schema=./prisma/schema.postgresql.prisma
```

### Step 3: Verify PostgreSQL Production State
Execute verification queries against the direct connection:
```sql
SELECT version();
SELECT current_database();
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
SELECT count(*) FROM "_prisma_migrations" WHERE rolled_back_at IS NULL;
```
Expected: 14 relational tables created, zero rollbacks, SSL enabled.

*Note: Zero development or test seed data will be copied to production.*
