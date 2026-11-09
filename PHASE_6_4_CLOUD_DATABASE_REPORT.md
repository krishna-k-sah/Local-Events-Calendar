# PHASE 6.4: CLOUD POSTGRESQL PROVISIONING & CONNECTION POOLING AUDIT
**EventHub — Local Event Calendar Management System**  
**Author:** Senior PostgreSQL Database Administrator & Infrastructure Lead  
**Date:** November 2026  
**Target Release:** EventHub 6.4.0  
**Target Provider:** **Neon Serverless PostgreSQL (PostgreSQL 16.x)**

---

## 1. NEON PLAN LIMITS & REALISTIC POOLING CONSTRAINTS

In cloud serverless environments, connection pooling parameters must be calibrated against actual infrastructure limits rather than assumed to be infinite:

### 1.1 Neon Free / Starter Plan Specifications
- **PostgreSQL Version:** 16.x (Full ANSI standard SQL support with row-level locking)
- **Active Compute Hours:** 100 compute hours / month (with automatic scale-to-zero when idle)
- **Storage Allowance:** 0.5 GB included (EventHub initial schema + synthetic data is <15 MB)
- **Direct Compute Connections:** Max 100 direct backend connections on port 5432.
- **Pooled Connections via PgBouncer:** Neon includes a built-in PgBouncer pooler on port 6543 configured in **transaction pooling mode**.
- **Application Pool Calibration:** While PgBouncer can handle thousands of transient client connections, the Express backend must be configured with a bounded connection pool in Prisma:
  ```
  postgresql://[user]:[password]@[ep-id]-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=20
  ```
  This guarantees that backend instances never overwhelm PgBouncer worker threads or compute memory.

---

## 2. SEPARATION OF STAGING & PRODUCTION ENVIRONMENTS

To prevent test runs from polluting production records:
- **Local Staging Environment:** Docker Desktop PostgreSQL 16 (`localhost:5432/eventhub_staging`). Used for automated Vitest suites, concurrency stress tests, and local rehearsals.
- **Neon Staging Branch:** Neon's instant database branching allows creating an isolated branch `staging` cloned directly from `main` without additional compute fees.
- **Neon Production Branch:** Dedicated `main` branch connected only to the production Railway backend container.

---

## 3. ZERO-CREDENTIAL LEAKAGE PROTOCOL

Per strict security rules:
- **No In-Chat Credential Pasting:** The user is never asked to disclose their private Neon database password, connection string, or secret key in chat.
- **Direct Platform Entry:** The user configures `DATABASE_URL` directly in Railway's encrypted environment variables dashboard or terminal prompt:
  ```powershell
  # Railway CLI secure variable setting:
  npx @railway/cli variables --set "DATABASE_URL=postgresql://..."
  ```

---

## 4. RELATIONAL SCHEMA & MIGRATION VERIFICATION (14 TABLES)

Migrations are applied once via the controlled release command:
```bash
npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma
```

### Relational Schema Invariant Audit:
1. `User` — Authentication, roles (`ADMIN`, `ORGANIZER`, `ATTENDEE`), bcrypt passwords.
2. `Category` — Event categorization with unique slugs and icons.
3. `Location` — Geographic coordinates (latitude/longitude), address, city, country.
4. `Event` — Title, description, dates, capacity, status (`DRAFT`, `PENDING`, `APPROVED`, `CANCELLED`).
5. `Registration` — Attendee event reservations; composite unique key `(userId, eventId)`.
6. `Review` — Star ratings and attendee comments; composite unique key `(userId, eventId)`.
7. `Notification` — Push alerts for confirmations, status updates, and reminders.
8. `Favorite` — User bookmarked events; composite unique key `(userId, eventId)`.
9. `Waitlist` — Auto-promotion queue; unique constraint on `(eventId, position)`.
10. `Ticket` — Cryptographically signed digital tickets; unique `ticketCode`.
11. `AttendanceRecord` — Door scan records; unique constraint on `ticketId` prevents double check-ins.
12. `EventReminder` — Scheduled reminder worker records with lease claim metadata.
13. `AuditLog` — Administrative actions and system audit logs.
14. `_prisma_migrations` — Internal Prisma migration checksum journal.

**Classification:** **CLOUD DATABASE CONFIGURATION READY**
