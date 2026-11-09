# PHASE 6.6.3.3 — NEON PRODUCTION DEPLOYMENT EVIDENCE REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.3  
**Provider:** Neon Serverless PostgreSQL 16  
**Project Name:** `eventhub-production`  
**Database Name:** `eventhub_production`  
**Prisma ORM Version:** `5.22.0`  
**Status:** **GATED AT CLOUD PROVISIONING BOUNDARY**

---

## 1. Local Schema & Migration Verification Evidence

Prior to executing cloud provisioning, the local Prisma schema and migration definitions were verified:

- **Schema File:** [`server/prisma/schema.postgresql.prisma`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/prisma/schema.postgresql.prisma)
- **Engine Provider:** PostgreSQL
- **Dual-Connection Architecture:**
  - `url = env("DATABASE_URL")` (Pooled PgBouncer connection for Express runtime)
  - `directUrl = env("DIRECT_URL")` (Unpooled compute connection for Prisma DDL migrations)
- **Local Validation:** Executed `npm run prisma:generate:pg`. Prisma Client v5.22.0 generated in 168ms with 0 errors.
- **Migration SQL:** Verified [`server/prisma/migrations/20261109081621_init_postgresql/migration.sql`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/prisma/migrations/20261109081621_init_postgresql/migration.sql) contains the complete 14-table relational schema with composite indexes, foreign keys, and unique constraints.

---

## 2. Interactive Neon Activation Runbook (PowerShell)

Execute the following steps to provision and migrate your production database:

### Step 1: Create Neon Project & Database
1. Open [console.neon.tech](https://console.neon.tech) in your browser.
2. Click **Create Project**:
   - **Project Name:** `eventhub-production`
   - **Database Name:** `eventhub_production`
   - **Postgres Engine:** `PostgreSQL 16`
3. In the Neon Dashboard, copy both connection strings:
   - **Pooled connection string (`DATABASE_URL`):**
     Format: `postgresql://<user>:<password>@<ep-*-pooler>.<region>.aws.neon.tech/eventhub_production?sslmode=require`
   - **Direct unpooled connection string (`DIRECT_URL`):**
     Format: `postgresql://<user>:<password>@<ep-*>.<region>.aws.neon.tech/eventhub_production?sslmode=require`

### Step 2: Apply Migrations from Windows Terminal
Run from the `server/` directory:
```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"
$env:DATABASE_URL="<your-neon-pooled-url>"
$env:DIRECT_URL="<your-neon-direct-url>"
node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.postgresql.prisma
```

*Expected Verification Output:*
```
14 migrations applied
The PostgreSQL database is now in sync with the schema.
```

---

## 3. Post-Migration Verification Queries

Execute against the direct connection to confirm database readiness:
```sql
SELECT version();
SELECT current_database();
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
SELECT count(*) FROM "_prisma_migrations" WHERE rolled_back_at IS NULL;
SHOW ssl;
```

Expected Result:
- Engine: PostgreSQL 16
- Database: `eventhub_production`
- Tables: 14 relational tables created
- Migrations: 1 active migration applied, 0 rollbacks
- SSL: `on`
