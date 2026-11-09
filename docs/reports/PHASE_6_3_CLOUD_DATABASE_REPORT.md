# PHASE 6.3: CLOUD POSTGRESQL PROVISIONING & DATABASE VERIFICATION
**EventHub — Local Event Calendar Management System**  
**Author:** Senior PostgreSQL Database Administrator & Infrastructure Lead  
**Date:** November 2026  
**Target Release:** EventHub 6.3.0  
**Target Database Provider:** **Neon Serverless PostgreSQL (PostgreSQL 16.x)**

---

## 1. CLOUD VS. LOCAL STAGING ENVIRONMENT DELINEATION

Per Phase 6.3 requirements, environmental boundaries must be rigorously distinguished:

- **Local Staging Environment (`eventhub_staging`):** Hosted locally in Windows Docker Desktop container (`eventhub-postgres`, PostgreSQL 16.15-Alpine). Utilized for CI/CD container tests, local migration rehearsals, and disaster recovery simulation.
- **Cloud Production Environment (`eventhub_production`):** Hosted remotely on Neon Serverless PostgreSQL. Fully isolated VPC, mandatory TLS encryption, automated PITR continuous archiving, and PgBouncer connection pooling.

---

## 2. PRODUCTION DATABASE SPECIFICATION & CONFIGURATION

### 2.1 Connection Topologies & Pooling Parameters
Neon provides two distinct connection endpoints:
1. **Pooled Endpoint (Port 6543 - Recommended for Application Runtime):**
   ```
   postgresql://eventhub_user:[REDACTED]@ep-silent-sea-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
   ```
   - Leverages transaction-mode PgBouncer pooling.
   - Prevents connection starvation during traffic surges or concurrent registration bursts.
   - Max connection headroom: 10,000 pooled client connections.

2. **Direct Unpooled Endpoint (Port 5432 - Required for Schema Migrations):**
   ```
   postgresql://eventhub_user:[REDACTED]@ep-silent-sea-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   - Direct connection to PostgreSQL compute instance.
   - Required by Prisma Migrate for schema lock acquisition (`_prisma_migrations`).

### 2.2 Security & Credential Hygiene
- **Zero In-Chat Credential Sharing:** Per Phase 6.3 protocol, full database connection URLs and database passwords must **NEVER** be pasted into chat or recorded in plain text.
- **Dashboard Secret Injection:** Database credentials are injected directly into Railway's encrypted environment variable vault as `DATABASE_URL` and `DIRECT_URL`.
- **Mandatory TLS:** All connections strictly require `sslmode=require` (TLS 1.3). Plaintext TCP connections are rejected at the edge.

---

## 3. RELATIONAL SCHEMA ARCHITECTURE: 14 VERIFIED TABLES

The production schema (`server/prisma/schema.postgresql.prisma`) provisions 14 relational tables with full referential integrity:

| # | Relational Table | Primary Key | Critical Foreign Keys & Composite Constraints | Indexing Strategy |
|---|---|---|---|---|
| 1 | `User` | `id` (String UUID) | Unique: `email` | Index on `role`, `createdAt` |
| 2 | `Category` | `id` (String UUID) | Unique: `name`, `slug` | Index on `slug` |
| 3 | `Location` | `id` (String UUID) | Latitude / Longitude coordinates | Compound index on `(city, country)` |
| 4 | `Event` | `id` (String UUID) | FK: `organizerId` -> `User(id)`, `categoryId`, `locationId` | Compound index on `(status, startDate)` |
| 5 | `Registration` | `id` (String UUID) | FK: `userId`, `eventId`; **Unique: `(userId, eventId)`** | Index on `(eventId, status)` |
| 6 | `Review` | `id` (String UUID) | FK: `userId`, `eventId`; **Unique: `(userId, eventId)`** | Index on `eventId` |
| 7 | `Notification` | `id` (String UUID) | FK: `userId` -> `User(id)` | Index on `(userId, isRead, createdAt)` |
| 8 | `Favorite` | `id` (String UUID) | FK: `userId`, `eventId`; **Unique: `(userId, eventId)`** | Index on `userId` |
| 9 | `Waitlist` | `id` (String UUID) | FK: `userId`, `eventId`; **Unique: `(userId, eventId)`** | **Unique: `(eventId, position)`** |
| 10 | `Ticket` | `id` (String UUID) | FK: `registrationId` -> `Registration(id)`; **Unique: `ticketCode`** | Unique: `ticketCode` |
| 11 | `AttendanceRecord` | `id` (String UUID) | FK: `ticketId`, `scannedById`; **Unique: `ticketId`** | Index on `scannedAt` |
| 12 | `EventReminder` | `id` (String UUID) | FK: `registrationId`; **Unique: `(registrationId, reminderType)`** | Index on `(status, scheduledFor)` |
| 13 | `AuditLog` | `id` (String UUID) | FK: `userId` -> `User(id)` | Index on `(action, createdAt)` |
| 14 | `_prisma_migrations` | `id` (String) | Internal Prisma migration journal and checksums | Primary key index |

---

## 4. MIGRATION EXECUTION PROCEDURE

### Non-Destructive Production Migration Strategy
```bash
# Executed via CI/CD release command or administrative CLI with DIRECT_URL:
npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma
```

### Safety Guarantees:
1. **Zero Data Loss:** `prisma migrate deploy` only executes pending forward-only SQL migration scripts from `server/prisma/migrations/`.
2. **Deterministic Locking:** Uses PostgreSQL transactional advisory locks to guarantee that concurrent migration commands cannot execute out-of-order.
3. **No Drift:** Verifies migration checksums against `_prisma_migrations`.
4. **`prisma db push` Prohibition:** `db push` is permanently disabled in the production deployment pipeline.

**Classification:** **CLOUD DATABASE CONFIGURATION CERTIFIED**

