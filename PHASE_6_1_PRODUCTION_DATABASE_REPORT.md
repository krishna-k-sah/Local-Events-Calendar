# PHASE 6.1: PRODUCTION DATABASE DEPLOYMENT REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Principal PostgreSQL Administrator  
**Date:** November 2026  
**Database Deployment Status:** **STAGING DEPLOYMENT VERIFIED (Awaiting Cloud Database Credentials)**  
**Engine:** PostgreSQL 16.15  

---

## 1. PRODUCTION DATABASE SPECIFICATION

### 1.1 Connection & Pooling Configuration
```bash
# Production Connection URI Format
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public&sslmode=require&connection_limit=20&pool_timeout=10"
```
- **Connection Limit**: 20 pooled connections per application replica.
- **Pool Timeout**: 10 seconds.
- **Wire Encryption**: TLS 1.3 enforced via `sslmode=require`.

### 1.2 Formal Production Migration Runbook
In production CI/CD, the following command applies all pending version-controlled migrations:
```bash
npx prisma migrate deploy --schema=server/prisma/schema.postgresql.prisma
```
*Note*: `prisma db push` is strictly forbidden in production.

---

## 2. VERIFIED 14 RELATIONAL TABLES & SCHEMA CONSTRAINTS

| Table Name | Primary Key | Foreign Key Cascades | Unique Constraints | Multi-Column Indexes |
|---|---|---|---|---|
| `roles` | `id` (cuid) | Restricts deletion if users exist | `name` | — |
| `users` | `id` (cuid) | References `roles(id)` | `email` | `roleId`, `email` |
| `categories` | `id` (cuid) | Restricts deletion if events exist | `name`, `slug` | — |
| `locations` | `id` (cuid) | Restricts deletion if events exist | — | `city` |
| `events` | `id` (cuid) | Cascades on `organizerId` | — | `organizerId`, `categoryId`, `status`, `startDate` |
| `registrations`| `id` (cuid) | Cascades on `eventId`, `userId` | `(userId, eventId)`, `ticketCode`| `userId`, `eventId`, `ticketCode` |
| `waitlists` | `id` (cuid) | Cascades on `eventId`, `userId` | `(userId, eventId)` | `eventId`, `userId`, `status` |
| `attendances` | `id` (cuid) | Cascades on `eventId`, SetNull on `registrationId`| `(eventId, ticketCode)`, `registrationId` | `eventId`, `userId`, `ticketCode` |
| `event_reminders`| `id` (cuid)| Cascades on `eventId`, `userId` | `(eventId, userId, reminderType)`| `scheduledFor`, `status` |
| `activity_logs`| `id` (cuid) | SetNull on `userId` | — | `userId`, `action`, `entityType` |
| `favorites` | `id` (cuid) | Cascades on `eventId`, `userId` | `(userId, eventId)` | `userId`, `eventId` |
| `notifications`| `id` (cuid)| Cascades on `userId`, SetNull on `eventId`| — | `userId`, `isRead` |
| `event_images` | `id` (cuid) | Cascades on `eventId` | — | `eventId` |
| `_prisma_migrations`| `id` | Internal migration tracking | — | — |

---

## 3. SEED DATA POLICY FOR PRODUCTION

To ensure data hygiene in production:
- Demo test accounts (Alice, Bob, etc.) are **strictly omitted** from production seeding.
- Only baseline roles (`ADMIN`, `ORGANIZER`, `ATTENDEE`) and standard event categories (Technology, Music, Sports, Art, Community, Food, Business, Health) are initialized.
- System administrator credentials must be provisioned with a unique, cryptographically generated password.

**Classification:** **STAGING DEPLOYMENT VERIFIED**

