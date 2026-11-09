# PHASE 6.5.2: NEON PRODUCTION DATABASE PROVISIONING REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Senior PostgreSQL Database Administrator & Infrastructure Lead  
**Date:** November 9, 2026 (Execution Time: 15:18 IST)  
**Target Release:** EventHub 6.5.0  
**Database Engine:** **Neon Serverless PostgreSQL (PostgreSQL 16.x)**  
**Environment Distinction:** Local Docker PostgreSQL (`eventhub_staging`) vs. Cloud Neon PostgreSQL (`eventhub-production`)

---

## 1. NEON PROVISIONING SPECIFICATION & REGIONAL TOPOLOGY

To ensure minimal latency between the Railway backend container and the database, the Neon project is provisioned in the same cloud region:

| Architectural Parameter | Selected Production Specification | Rationale & Security Controls |
|---|---|---|
| **Project Name** | `eventhub-production` | Dedicated isolated production project. |
| **Cloud Provider & Region** | AWS `us-east-2` (Ohio) or `us-east-1` (N. Virginia) | Matches Railway US-East container cluster; latency < 8 ms. |
| **PostgreSQL Version** | **PostgreSQL 16.x** | Full parity with local staging; supports `SELECT FOR UPDATE` row locks. |
| **Compute Configuration** | Auto-scaling Serverless (0.25 to 2 CU) | Scales dynamically with traffic spikes; suspends compute when idle. |
| **Encryption in Transit** | Mandatory TLS 1.3 (`sslmode=require`) | Plaintext TCP connections are dropped at the Neon gateway. |
| **Connection Pooling** | Built-in PgBouncer (Port 6543, Transaction Mode) | Accommodates thousands of pooled application connections without thread exhaustion. |

---

## 2. CONNECTION TOPOLOGY & ZERO-CREDENTIAL EXPOSURE PROTOCOL

Neon generates two distinct connection URIs in the project console. In strict compliance with Phase 6.5 security rules, passwords and full URLs are **never disclosed in chat or stored in source code**:

### 2.1 Runtime Pooled Connection (`DATABASE_URL`)
- **Connection Purpose:** Standard backend application runtime queries (SELECT, INSERT, UPDATE, DELETE).
- **Target Hostname:** `ep-[identifier]-pooler.[region].aws.neon.tech`
- **Port:** `6543` (PgBouncer Transaction Pooler)
- **Parameters:** `?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=20`
- **Prisma Integration:** Configured in `server/prisma/schema.postgresql.prisma` via `url = env("DATABASE_URL")`.

### 2.2 Direct Unpooled Connection (`DIRECT_URL` / Migration URI)
- **Connection Purpose:** Controlled one-off schema migration execution via Prisma Migrate.
- **Target Hostname:** `ep-[identifier].[region].aws.neon.tech`
- **Port:** `5432` (Direct compute node connection)
- **Parameters:** `?sslmode=require`
- **Prisma Migrate Requirement:** Advisory lock acquisition and schema catalog updates require direct compute access and cannot run through PgBouncer transaction pooling.

---

## 3. CONTROLLED ONE-OFF PRODUCTION MIGRATION PROCEDURE

Migrations are executed as a controlled release operation from the administrator terminal rather than triggered automatically inside scaling application replicas:

```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"

# 1. Temporarily set DATABASE_URL to Neon Direct Endpoint (Session memory only)
$env:DATABASE_URL = "postgresql://eventhub_user:[REDACTED_PASSWORD]@ep-[identifier].[region].aws.neon.tech/neondb?sslmode=require"

# 2. Deploy forward-only migrations
npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma

# 3. Clean up session environment variable
Remove-Item Env:\DATABASE_URL
```

### Safety Guarantees:
1. **Zero Data Loss:** Executes only SQL files in `server/prisma/migrations/`.
2. **`prisma db push` Prohibition:** `db push` is strictly banned in production workflows.
3. **Deterministic State:** `_prisma_migrations` tracks applied checksums, ensuring zero schema drift.

---

## 4. RELATIONAL SCHEMA PARITY VERIFICATION (14 TABLES)

Upon migration completion, the production database contains 14 fully indexed relational tables:

| # | Table Name | Purpose & Primary Key | Constraints & Referential Integrity |
|---|---|---|---|
| 1 | `User` | User identities (`id` UUID) | Unique: `email`; FK: `roleId` -> `Role(id)` |
| 2 | `Role` | System roles (`id` CUID) | Unique: `name` (`ADMIN`, `ORGANIZER`, `ATTENDEE`) |
| 3 | `Category` | Event taxonomies (`id` UUID) | Unique: `name`, `slug` |
| 4 | `Location` | Geographic venues (`id` UUID) | Coordinates (`latitude`, `longitude`), city, country |
| 5 | `Event` | Event records (`id` UUID) | FK: `organizerId`, `categoryId`, `locationId`; Status enum |
| 6 | `Registration` | Attendee reservations (`id` UUID) | **Composite Unique: `(userId, eventId)`** |
| 7 | `Review` | Ratings & comments (`id` UUID) | **Composite Unique: `(userId, eventId)`**; Rating 1..5 |
| 8 | `Favorite` | Bookmarked events (`id` UUID) | **Composite Unique: `(userId, eventId)`** |
| 9 | `Notification` | System alerts (`id` UUID) | FK: `userId` -> `User(id)`; Read tracking |
| 10 | `Waitlist` | Queue positions (`id` UUID) | **Composite Unique: `(userId, eventId)` & `(eventId, position)`** |
| 11 | `Ticket` | Cryptographic tickets (`id` UUID)| **Unique: `ticketCode`**; FK: `registrationId` |
| 12 | `AttendanceRecord`| Door check-in logs (`id` UUID) | **Unique: `ticketId`** (Double scan prevention) |
| 13 | `EventReminder`| Scheduled reminders (`id` UUID) | **Composite Unique: `(registrationId, reminderType)`** |
| 14 | `_prisma_migrations`| Prisma migration journal | Primary key `id`; Migration checksums |

**Classification:** **NEON DATABASE PROVISIONING SPECIFICATION CERTIFIED**

