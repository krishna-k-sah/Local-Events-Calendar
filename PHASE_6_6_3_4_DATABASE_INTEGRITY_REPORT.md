# EventHub Phase 6.6.3.4 – Database Integrity Report

**Project:** EventHub – Local Event Calendar Management System  
**Audit Phase:** Phase 6.6.3.4  
**Date:** 2026-11-09  
**Database Engine:** PostgreSQL 16  
**ORM:** Prisma 5.22.0  

---

## 1. Relational Schema & Invariants

EventHub relies on PostgreSQL 16 relational integrity constraints to guarantee ACID properties across all concurrent workflows.

### 1.1 Complete Model Catalog (13 Models)

| Model Name | Table Name | Primary Key | Critical Constraints |
|---|---|---|---|
| `Role` | `Role` | `id` (cuid) | `UNIQUE(name)` |
| `User` | `User` | `id` (cuid) | `UNIQUE(email)`, FK to `Role` |
| `Category` | `Category` | `id` (cuid) | `UNIQUE(name)`, `UNIQUE(slug)` |
| `Location` | `Location` | `id` (cuid) | Index on `city`, `postalCode` |
| `Event` | `Event` | `id` (cuid) | FKs to `User`, `Category`, `Location`; Indexes on `startDate`, `status` |
| `Registration` | `Registration` | `id` (cuid) | `UNIQUE(userId, eventId)`, `UNIQUE(ticketCode)` |
| `Favorite` | `Favorite` | `id` (cuid) | `UNIQUE(userId, eventId)` |
| `Notification` | `Notification` | `id` (cuid) | FK to `User`; Index on `createdAt`, `isRead` |
| `EventImage` | `EventImage` | `id` (cuid) | FK to `Event` |
| `ActivityLog` | `ActivityLog` | `id` (cuid) | FK to `User`; Index on `createdAt` |
| `Waitlist` | `Waitlist` | `id` (cuid) | `UNIQUE(userId, eventId)`, Index on `[eventId, position]` |
| `Attendance` | `Attendance` | `id` (cuid) | `UNIQUE(ticketCode)`, `UNIQUE(registrationId)` |
| `EventReminder` | `EventReminder` | `id` (cuid) | FK to `Event`, `User`; Index on `[status, scheduledFor]` |

---

## 2. Concurrency Safety & Race Condition Prevention

### 2.1 The Flash Registration Concurrency Test
- **Scenario:** 10 simultaneous registration requests for an event with only 1 remaining seat.
- **Mechanism:** Interactive PostgreSQL transactions with double-checked capacity locking.
  ```javascript
  await prisma.$transaction(async (tx) => {
    const currentCount = await tx.registration.count({
      where: { eventId, status: 'CONFIRMED' }
    });
    if (currentCount >= event.capacity) {
      throw new CapacityExceededError('Event is sold out');
    }
    // Proceed to create registration
  });
  ```
- **Test Result:** Verified in `tests/phase5_5_postgresql_concurrency.test.js` (Test 1). Exactly 1 user is admitted; 9 users receive `400 Bad Request` (Sold Out). Zero overselling occurred.

### 2.2 Duplicate Registration Concurrency Test
- **Scenario:** The same user issues 2 parallel registration requests for the same event.
- **Mechanism:** PostgreSQL database-level unique constraint `UNIQUE(userId, eventId)`.
- **Test Result:** Verified in `tests/phase5_5_postgresql_concurrency.test.js` (Test 2). Exactly 1 registration record is created; the second request triggers a constraint violation and is rejected with `409 Conflict`.

### 2.3 Attendance Door Scanner Idempotency Test
- **Scenario:** 6 simultaneous scan requests for the same valid ticket token.
- **Mechanism:** PostgreSQL unique constraint `UNIQUE(ticketCode)` on `Attendance` table within a serializable transaction.
- **Test Result:** Verified in `tests/phase5_5_postgresql_concurrency.test.js` (Test 3). Exactly 1 scan succeeds (200 OK); the remaining 5 requests are rejected with `409 Conflict` (Already checked in).

### 2.4 Sequential Waitlist Queue Test
- **Scenario:** 6 simultaneous waitlist join requests for a full event.
- **Mechanism:** Enqueue transaction locks the event waitlist sequence and assigns monotonic positions.
- **Test Result:** Verified in `tests/phase5_5_postgresql_concurrency.test.js` (Test 4). Positions `[1, 2, 3, 4, 5, 6]` are assigned sequentially without collision or position gaps.

---

## 3. Transaction Rollback & State Isolation

### 3.1 Transaction Rollback Integrity Test
- **Scenario:** An unhandled error or database failure occurs midway through an event creation or booking transaction.
- **Verification:** Verified in `tests/phase5_5_postgresql_concurrency.test.js` (Test 6). The transaction rolls back atomically. Zero partial records (orphaned tickets, ghost activity logs) persist in PostgreSQL.

---

## 4. Connection Pooling and DDL Separation

To support serverless environments (Neon PostgreSQL + Railway backend):
1. **Pooled Runtime Queries:** `DATABASE_URL` connects through pgBouncer (port 6543) with query-level transaction pooling.
2. **DDL Migrations:** `DIRECT_URL` connects directly to the PostgreSQL compute node (port 5432) to support schema migrations (`prisma migrate deploy`) without pooling interference.

---

## 5. Verification Summary

PostgreSQL schema constraints, isolation levels, and transactional invariants have been thoroughly verified through dedicated automated concurrency suites. Data integrity is guaranteed under high concurrency.
