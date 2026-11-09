# PHASE 5.4: POSTGRESQL MIGRATION & SCHEMA SPECIFICATION REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Principal Database Architect  
**Date:** November 2026  
**Schema File:** `server/prisma/schema.postgresql.prisma`  
**Prisma Engine Status:** **VALIDATED & CLIENT GENERATED**  
**Live Daemon Execution Status:** **BLOCKED** (Awaiting PostgreSQL Service)  

---

## 1. COMPILATION & CLIENT GENERATION VERIFICATION

In Phase 5.4, the PostgreSQL schema was compiled and verified using the official Prisma CLI compiler:

```bash
$ npm --prefix server run prisma:generate:pg

> local-event-calendar-server@1.0.0 prisma:generate:pg
> prisma generate --schema=prisma/schema.postgresql.prisma

Environment variables loaded from .env
Prisma schema loaded from prisma\schema.postgresql.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 133ms
```

---

## 2. DETAILED RELATIONAL SCHEMA MAPPING SPECIFICATION

When applied against a live PostgreSQL 15+ database via `npx prisma db push --schema=prisma/schema.postgresql.prisma`, the engine provisions the following relational structures:

```
+----------------------------------------------------------------------------------------------------+
|                                    POSTGRESQL TABLE STRUCTURE                                      |
+----------------------------------------------------------------------------------------------------+
| Table: roles                                                                                       |
|   - id: VARCHAR(30) PRIMARY KEY                                                                    |
|   - name: VARCHAR(191) UNIQUE NOT NULL                                                             |
|   - description: TEXT                                                                              |
|   - createdAt: TIMESTAMP(3) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP                               |
|   - updatedAt: TIMESTAMP(3) WITH TIME ZONE NOT NULL                                                |
+----------------------------------------------------------------------------------------------------+
| Table: users                                                                                       |
|   - id: VARCHAR(30) PRIMARY KEY                                                                    |
|   - email: VARCHAR(191) UNIQUE NOT NULL                                                            |
|   - passwordHash: VARCHAR(255) NOT NULL                                                            |
|   - fullName: VARCHAR(191) NOT NULL                                                                |
|   - phone: VARCHAR(50) NULL                                                                        |
|   - avatarUrl: TEXT NULL                                                                           |
|   - city: VARCHAR(100) NULL                                                                        |
|   - roleId: VARCHAR(30) REFERENCES roles(id) ON DELETE RESTRICT                                    |
|   - createdAt: TIMESTAMP(3) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP                               |
|   - updatedAt: TIMESTAMP(3) WITH TIME ZONE NOT NULL                                                |
|   INDEXES: users_email_key (UNIQUE), users_roleId_idx, users_email_idx                             |
+----------------------------------------------------------------------------------------------------+
| Table: categories                                                                                  |
|   - id: VARCHAR(30) PRIMARY KEY                                                                    |
|   - name: VARCHAR(100) UNIQUE NOT NULL                                                             |
|   - slug: VARCHAR(100) UNIQUE NOT NULL                                                             |
|   - color: VARCHAR(20) DEFAULT '#6366f1'                                                           |
|   - icon: VARCHAR(50) DEFAULT 'Tag'                                                                |
|   - description: TEXT NULL                                                                         |
|   - createdAt: TIMESTAMP(3) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP                               |
|   - updatedAt: TIMESTAMP(3) WITH TIME ZONE NOT NULL                                                |
+----------------------------------------------------------------------------------------------------+
| Table: locations                                                                                   |
|   - id: VARCHAR(30) PRIMARY KEY                                                                    |
|   - venueName: VARCHAR(191) NOT NULL                                                               |
|   - address: VARCHAR(255) NOT NULL                                                                 |
|   - city: VARCHAR(100) NOT NULL                                                                    |
|   - state: VARCHAR(100) NULL                                                                       |
|   - postalCode: VARCHAR(20) NULL                                                                   |
|   - latitude: DOUBLE PRECISION NULL                                                                |
|   - longitude: DOUBLE PRECISION NULL                                                               |
|   - createdAt: TIMESTAMP(3) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP                               |
|   - updatedAt: TIMESTAMP(3) WITH TIME ZONE NOT NULL                                                |
|   INDEXES: locations_city_idx                                                                      |
+----------------------------------------------------------------------------------------------------+
| Table: events                                                                                      |
|   - id: VARCHAR(30) PRIMARY KEY                                                                    |
|   - title: VARCHAR(191) NOT NULL                                                                   |
|   - description: TEXT NOT NULL                                                                     |
|   - organizerId: VARCHAR(30) REFERENCES users(id) ON DELETE CASCADE                                |
|   - categoryId: VARCHAR(30) REFERENCES categories(id) ON DELETE RESTRICT                           |
|   - locationId: VARCHAR(30) REFERENCES locations(id) ON DELETE RESTRICT                             |
|   - startDate: TIMESTAMP(3) WITH TIME ZONE NOT NULL                                                |
|   - endDate: TIMESTAMP(3) WITH TIME ZONE NULL                                                      |
|   - registrationDeadline: TIMESTAMP(3) WITH TIME ZONE NULL                                         |
|   - maxCapacity: INTEGER DEFAULT 100 NOT NULL                                                      |
|   - currentRegistered: INTEGER DEFAULT 0 NOT NULL                                                  |
|   - price: DOUBLE PRECISION DEFAULT 0.0 NOT NULL                                                   |
|   - isFree: BOOLEAN DEFAULT TRUE NOT NULL                                                          |
|   - status: VARCHAR(50) DEFAULT 'PENDING' NOT NULL                                                 |
|   - isFeatured: BOOLEAN DEFAULT FALSE NOT NULL                                                     |
|   INDEXES: events_organizerId_idx, events_categoryId_idx, events_locationId_idx,                   |
|            events_status_idx, events_startDate_idx                                                 |
+----------------------------------------------------------------------------------------------------+
| Table: registrations                                                                               |
|   - id: VARCHAR(30) PRIMARY KEY                                                                    |
|   - eventId: VARCHAR(30) REFERENCES events(id) ON DELETE CASCADE                                   |
|   - userId: VARCHAR(30) REFERENCES users(id) ON DELETE CASCADE                                     |
|   - ticketCode: VARCHAR(100) UNIQUE NOT NULL                                                       |
|   - ticketStatus: VARCHAR(50) DEFAULT 'VALID' NOT NULL                                             |
|   - status: VARCHAR(50) DEFAULT 'CONFIRMED' NOT NULL                                               |
|   - registeredAt: TIMESTAMP(3) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP                            |
|   - cancelledAt: TIMESTAMP(3) WITH TIME ZONE NULL                                                  |
|   INDEXES: registrations_userId_eventId_key (UNIQUE), registrations_ticketCode_key (UNIQUE),       |
|            registrations_userId_idx, registrations_eventId_idx, registrations_ticketCode_idx       |
+----------------------------------------------------------------------------------------------------+
| Table: waitlists                                                                                   |
|   - id: VARCHAR(30) PRIMARY KEY                                                                    |
|   - eventId: VARCHAR(30) REFERENCES events(id) ON DELETE CASCADE                                   |
|   - userId: VARCHAR(30) REFERENCES users(id) ON DELETE CASCADE                                     |
|   - status: VARCHAR(50) DEFAULT 'PENDING' NOT NULL                                                 |
|   - position: INTEGER DEFAULT 1 NOT NULL                                                           |
|   - offeredAt: TIMESTAMP(3) WITH TIME ZONE NULL                                                    |
|   - expiresAt: TIMESTAMP(3) WITH TIME ZONE NULL                                                    |
|   - createdAt: TIMESTAMP(3) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP                               |
|   - updatedAt: TIMESTAMP(3) WITH TIME ZONE NOT NULL                                                |
|   INDEXES: waitlists_userId_eventId_key (UNIQUE), waitlists_eventId_idx, waitlists_status_idx       |
+----------------------------------------------------------------------------------------------------+
| Table: attendances                                                                                 |
|   - id: VARCHAR(30) PRIMARY KEY                                                                    |
|   - eventId: VARCHAR(30) REFERENCES events(id) ON DELETE CASCADE                                   |
|   - registrationId: VARCHAR(30) UNIQUE REFERENCES registrations(id) ON DELETE SET NULL             |
|   - userId: VARCHAR(30) REFERENCES users(id) ON DELETE CASCADE                                     |
|   - ticketCode: VARCHAR(100) NOT NULL                                                              |
|   - scannedById: VARCHAR(30) REFERENCES users(id) ON DELETE RESTRICT                               |
|   - scannedAt: TIMESTAMP(3) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP                               |
|   - method: VARCHAR(50) DEFAULT 'QR' NOT NULL                                                      |
|   INDEXES: attendances_registrationId_key (UNIQUE), attendances_eventId_ticketCode_key (UNIQUE)    |
+----------------------------------------------------------------------------------------------------+
| Table: event_reminders                                                                             |
|   - id: VARCHAR(30) PRIMARY KEY                                                                    |
|   - eventId: VARCHAR(30) REFERENCES events(id) ON DELETE CASCADE                                   |
|   - userId: VARCHAR(30) REFERENCES users(id) ON DELETE CASCADE                                     |
|   - reminderType: VARCHAR(20) NOT NULL                                                             |
|   - scheduledFor: TIMESTAMP(3) WITH TIME ZONE NOT NULL                                             |
|   - sentAt: TIMESTAMP(3) WITH TIME ZONE NULL                                                       |
|   - status: VARCHAR(50) DEFAULT 'PENDING' NOT NULL                                                 |
|   - attemptCount: INTEGER DEFAULT 0 NOT NULL                                                       |
|   - lastAttempt: TIMESTAMP(3) WITH TIME ZONE NULL                                                  |
|   - failureReason: TEXT NULL                                                                       |
|   INDEXES: event_reminders_eventId_userId_reminderType_key (UNIQUE),                               |
|            event_reminders_scheduledFor_idx, event_reminders_status_idx                            |
+----------------------------------------------------------------------------------------------------+
| Table: activity_logs                                                                               |
|   - id: VARCHAR(30) PRIMARY KEY                                                                    |
|   - userId: VARCHAR(30) REFERENCES users(id) ON DELETE SET NULL                                    |
|   - action: VARCHAR(100) NOT NULL                                                                  |
|   - entityType: VARCHAR(100) NOT NULL                                                              |
|   - entityId: VARCHAR(100) NULL                                                                    |
|   - detailsJson: TEXT NULL                                                                         |
|   - ipAddress: VARCHAR(45) NULL                                                                    |
|   - userAgent: TEXT NULL                                                                           |
|   - createdAt: TIMESTAMP(3) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP                               |
|   INDEXES: activity_logs_userId_idx, activity_logs_action_idx, activity_logs_entityType_idx        |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. LIVE DEPLOYMENT STATUS

- **Schema Syntax & Compilation:** **PASS** (100% Validated by Prisma Core Engine).
- **Client Artifact:** Generated to `node_modules/@prisma/client` with full type declarations.
- **Migration Push to Host Database:** **BLOCKED** due to absence of local port 5432 listener.
- **Resolution Path:** `npm --prefix server run prisma:push:pg` once the database container or service is activated.

