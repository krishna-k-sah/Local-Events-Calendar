# PHASE 5.5: POSTGRESQL CONCURRENCY & TRANSACTION STRESS REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Principal Database Architect & Systems Reliability Engineer  
**Date:** November 2026  
**Concurrency Status:** **PASS** (Zero Invariant Violations)  
**Database Engine:** PostgreSQL 16.15 (Container `eventhub-postgres`)  
**Isolation Level:** `Read Committed` with Pessimistic Row-Level Locking (`FOR UPDATE`)  

---

## 1. CONCURRENCY ARCHITECTURE & ENGINE PARITY ANALYSIS

### 1.1 The Challenge: PostgreSQL MVCC vs SQLite Locking
Under SQLite, write operations acquire an exclusive file-level lock, inherently serializing database writes. However, in PostgreSQL under the default `Read Committed` multi-version concurrency control (MVCC) isolation level, concurrent transactions execute concurrently without locking read rows. Without explicit row locks, concurrent transactions reading `currentRegistered` before committing observe the same stale count, allowing multiple transactions to satisfy the capacity check (`currentRegistered < maxCapacity`) simultaneously.

### 1.2 The Resolution: Explicit Pessimistic Row Locking
To guarantee zero overselling and collision-free queue numbering in PostgreSQL without deadlocks or write-conflict transaction aborts, pessimistic row-level locking was introduced in `server/src/controllers/registrationController.js` and `server/src/controllers/waitlistController.js`:

```javascript
// PostgreSQL Engine Check
const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql') || 
                   process.env.DATABASE_URL?.startsWith('postgres');

// Inside Interactive Transaction:
if (isPostgres) {
  // Acquire an exclusive row lock on the event for the duration of this transaction
  await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
}
```

This guarantees that whenever a seat is reserved or a waitlist queue number is calculated, competing concurrent transactions queue at the row lock, reading the updated committed state sequentially.

---

## 2. STRESS TEST EXECUTION EVIDENCE

All tests were executed against the live PostgreSQL database via Vitest suite `tests/phase5_5_postgresql_concurrency.test.js` and `tests/load_stress.test.js`:

```powershell
PS> npm --prefix server test -- phase5_5_postgresql_concurrency.test.js load_stress.test.js
 ✓ tests/load_stress.test.js (3 tests) 2248ms
   ✓ High-Concurrency Registration Race Condition (1)
     ✓ should strictly admit 1 user and reject 9 users when 1 seat remains under 10 concurrent requests 1205ms
   ✓ High-Concurrency Waitlist Enqueue Race Condition (1)
     ✓ should assign strictly sequential, collision-free waitlist positions (#1 through #6) under simultaneous joins 647ms
 ✓ tests/phase5_5_postgresql_concurrency.test.js (7 tests) 2919ms
   ✓ Phase 5.5 – Dedicated PostgreSQL Concurrency & Transaction Integrity Suite (7)
     ✓ Test 1: Flash Registration – 10 concurrent requests for 1 seat in PostgreSQL 1180ms
     ✓ Test 2: Duplicate Booking – Same user concurrently submitting 5 registrations for same event in PostgreSQL 420ms
     ✓ Test 3: Door Scanner Race – 2 scanners scanning the same QR ticket token concurrently in PostgreSQL 310ms
     ✓ Test 4: Waitlist Queue – 6 concurrent waitlist joins assign sequential positions [1..6] in PostgreSQL 748ms
     ✓ Test 5: Simultaneous Waitlist Promotion – Only 1 eligible user promoted on cancellation in PostgreSQL 290ms
     ✓ Test 6: Transaction Rollback – Failures cleanly roll back without leaving orphaned rows in PostgreSQL 125ms
     ✓ Test 7: Reminder Lease Recovery – PostgreSQL locked leases expire and recover cleanly 145ms

 Test Files  2 passed (2)
      Tests  10 passed (10)
   Duration  3.88s
```

---

## 3. INDIVIDUAL STRESS TEST MATRIX

### Test 1: Flash Registration (10 Concurrent Requests for 1 Seat)
- **Scenario**: Event created with `maxCapacity = 1`, `currentRegistered = 0`. Ten distinct attendee users concurrently execute `POST /api/registrations` via `Promise.all()`.
- **Database State Before**: `maxCapacity = 1`, `currentRegistered = 0`, Registrations = 0.
- **Observed Results**:
  - Success Count: **1** (HTTP 201 Created)
  - Rejected Count: **9** (HTTP 400 Bad Request, message: *"Event is sold out"*)
- **Database State After**: `maxCapacity = 1`, `currentRegistered = 1`, Registrations = 1.
- **Invariant Audit**: Invariant `currentRegistered <= maxCapacity` strictly maintained. Zero duplicate seats. Zero overselling.

### Test 2: Duplicate Booking (Same User 5 Concurrent Requests)
- **Scenario**: A single attendee user concurrently fires 5 identical registration requests for the same event via `Promise.all()`.
- **Database State Before**: Registrations = 0 for `(userId, eventId)`.
- **Observed Results**:
  - Success Count: **1** (HTTP 201 Created)
  - Rejected Count: **4** (HTTP 400 Bad Request, message: *"User already registered for this event"*)
- **Database State After**: Exactly 1 registration record in PostgreSQL.
- **Relational Constraint**: Guaranteed by database composite unique index `@@unique([userId, eventId])`.

### Test 3: Door Scanner Race (2 Concurrent Scanners for Same QR Pass)
- **Scenario**: Two door gate operators concurrently submit scan requests (`POST /api/phase5/attendance/scan`) for the identical valid ticket pass via `Promise.all()`.
- **Database State Before**: Ticket `ticketStatus = 'VALID'`, Attendance records = 0.
- **Observed Results**:
  - Admitted Scans: **1** (HTTP 200 OK, `admitted: true`, status transitions to `USED`)
  - Rejected Scans: **1** (HTTP 409 Conflict, message: *"Ticket has already been scanned"*)
- **Database State After**: Exactly 1 attendance record in `attendances` table with `method = 'QR'`.
- **Relational Constraint**: Guaranteed by `@@unique([eventId, ticketCode])` and `@@unique([registrationId])`.

### Test 4: Waitlist Queue Numbering (6 Concurrent Enqueues)
- **Scenario**: Event is sold out (`currentRegistered = maxCapacity`). Six different users simultaneously submit waitlist join requests (`POST /api/phase5/waitlist/join`) via `Promise.all()`.
- **Database State Before**: Waitlist count = 0.
- **Observed Results**:
  - Assigned Waitlist Positions: `[1, 2, 3, 4, 5, 6]` (strictly sequential, verified via Set size = 6)
  - Position Collisions: **0**
- **Database State After**: Exactly 6 rows in `waitlists` table with status `PENDING` and positions 1 through 6.
- **Engine Mechanism**: Serialized through event row lock `SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`.

### Test 5: Simultaneous Waitlist Promotion
- **Scenario**: Event is sold out with 2 users on the waitlist (User A at position #1, User B at position #2). A confirmed registrant cancels.
- **Database State Before**: User A position = 1, User B position = 2, Waitlists = 2.
- **Observed Results**:
  - User A promoted: `status = 'OFFERED'`, new confirmed seat reserved.
  - User B shifted: `position = 1`, `status = 'PENDING'`.
  - Double-promotion count: **0**.
- **Database State After**: Active registrations count unchanged (seat transferred), User A holds active promotion claim.

### Test 6: Transaction Rollback Integrity
- **Scenario**: An interactive transaction attempts to increment `currentRegistered` and insert a registration, but encounters an intentional exception midway through the transaction.
- **Database State Before**: `currentRegistered = 5`, Registrations = 5.
- **Observed Results**: Transaction aborts with PostgreSQL `ROLLBACK`.
- **Database State After**: `currentRegistered = 5`, Registrations = 5.
- **Invariant Audit**: Zero orphaned registration rows. Capacity counter strictly matches registered user count.

### Test 7: Reminder Lease Recovery & Worker Concurrency
- **Scenario**: Worker A claims a pending reminder by setting a lease lock (`attemptCount = 1`, `lastAttempt = now() - 6 minutes`). Worker A crashes without completing dispatch. Worker B initiates reminder processing.
- **Observed Results**: Worker B detects expired lease ($> 5$ minutes old), reclaims the task, dispatches notification, and transitions status to `SENT`.
- **Database State After**: Exactly 1 reminder sent. Zero duplicate notifications sent to user.

---

## 4. CONCURRENCY SUMMARY & PASS CERTIFICATE

| Concurrency Scenario | Competing Concurrency | Expected Outcome | Observed Outcome | Evaluation |
|---|---|---|---|---|
| Flash Registration | 10 requests / 1 seat | 1 Success, 9 Rejected | 1 Success, 9 Rejected | **PASS** |
| Duplicate Booking | 5 requests / same user | 1 Success, 4 Rejected | 1 Success, 4 Rejected | **PASS** |
| Door Scanner Race | 2 scanners / 1 ticket | 1 Admitted, 1 Conflict (409) | 1 Admitted, 1 Conflict (409) | **PASS** |
| Waitlist Enqueue | 6 simultaneous joins | Sequential positions $[1..6]$ | Strictly $[1, 2, 3, 4, 5, 6]$ | **PASS** |
| Waitlist Promotion | Concurrent cancellation | Exactly 1 promoted (pos 1) | Exactly 1 promoted, pos 2 shifted | **PASS** |
| Transaction Rollback | Mid-transaction fault | Zero dirty reads/orphaned rows | Complete rollback verified | **PASS** |
| Lease Recovery | Worker crash simulation | Expired lease acquired & sent | Expired lease recovered cleanly | **PASS** |

**Classification:** **PASS**

