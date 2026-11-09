# PHASE 6.2: PRODUCTION DATABASE DEPLOYMENT REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Principal PostgreSQL Database Administrator  
**Date:** November 2026  
**Target Release:** EventHub 6.2.0  
**Database Classification:** **STAGING CONTAINER VERIFIED (Awaiting Cloud Database Credentials)**  

---

## 1. POSTGRESQL ENVIRONMENT STATUS

To maintain rigorous transparency:
- **Current Operational Instance**: Local Docker Desktop Container `eventhub-postgres` (PostgreSQL 16.15 on `localhost:5432`).
- **Target Cloud Database Provider**: **Neon Serverless PostgreSQL 16** (or **Supabase PostgreSQL 16**).
- **Migration Engine**: `prisma migrate deploy --schema=prisma/schema.postgresql.prisma`.
- **Migration History**: `20261109081621_init_postgresql` applied cleanly to staging database `eventhub_staging`.

---

## 2. PRODUCTION DATABASE CONNECTION & POOLING PARAMETERS

When provisioning cloud PostgreSQL in the hosting provider's environment settings:

```bash
# Secure Environment Variable Template (Set in Cloud Dashboard Vault)
DATABASE_URL="postgresql://${USER}:${PASSWORD}@${HOST}:${PORT}/${DB_NAME}?schema=public&sslmode=require&connection_limit=20&pool_timeout=10"
```

### Security Directives:
1. `sslmode=require`: Enforces TLS 1.3 encryption across all network hops.
2. `connection_limit=20`: Caps pooled connections per instance to avoid backend exhaustion.
3. `pool_timeout=10`: Immediately fails starved requests after 10 seconds.
4. **Secret Protection**: Connection strings must be entered into the provider's web secrets dashboard and **NEVER** pasted into chat or committed to Git.

---

## 3. VERIFIED RELATIONAL INTEGRITY

All 14 tables, composite foreign keys, and indexes were verified:
- Foreign key cascades (`Event -> Registrations`, `Event -> Waitlists`, `User -> Registrations`).
- Unique composite constraints (`[userId, eventId]` on registrations and waitlists; `[eventId, ticketCode]` on attendances).
- Row-level concurrency locking (`SELECT ... FOR UPDATE`) guarantees zero overbooking under high-concurrency race conditions.

**Classification:** **STAGING CONTAINER VERIFIED**
