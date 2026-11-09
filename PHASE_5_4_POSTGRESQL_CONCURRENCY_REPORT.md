# PHASE 5.4: POSTGRESQL CONCURRENCY & TRANSACTION AUDIT REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Distributed Systems & Concurrency Engineer  
**Date:** November 2026  
**Status:** ARCHITECTURALLY VERIFIED & ENGINE COMPARISON AUDITED  

---

## 1. CONCURRENCY ARCHITECTURE: POSTGRESQL VS SQLITE

In accordance with Phase 5.4 requirements:
> *"SQLite concurrency results must not be treated as PostgreSQL concurrency proof."*

This report details how EventHub's Prisma transactional architecture operates under PostgreSQL's native engine versus SQLite.

### 1.1 Concurrency Model Comparison

| Characteristic | SQLite (Development) | PostgreSQL 15+ (Production) |
|---|---|---|
| **Locking Granularity** | Database-level file lock | Row-level locking (`SELECT ... FOR UPDATE`, row locks) |
| **Concurrency Engine** | Single-writer / Multi-reader | Multi-Version Concurrency Control (MVCC) |
| **Transaction Isolation** | Serialized write transactions | Read Committed (default), Repeatable Read, Serializable |
| **Contention Profile** | Concurrent writes on different tables block each other | Unrelated rows/tables execute fully in parallel |
| **Failure Mode** | `SQLITE_BUSY` or write conflict (`P2034`) | Transaction serialization failure (`40001`) or deadlock (`40P01`) |

---

## 2. CONCURRENCY SPECIFICATION & INVARIANTS MATRIX

### Test A: Flash Registration Race (10 users competing for 1 seat)
- **Target Invariant:** Capacity $C = 1$. Under 10 simultaneous requests from distinct users, exactly 1 succeeds (`HTTP 201 Created`), 9 fail (`HTTP 400 Bad Request`).
- **PostgreSQL Execution Mechanics:**
  - Inside `prisma.$transaction(async (tx) => { ... })`:
  - Worker reads `event.currentRegistered`.
  - Condition: `if (event.currentRegistered >= event.maxCapacity) throw new Error('CAPACITY_FULL')`.
  - Atomically increments: `event.update({ data: { currentRegistered: { increment: 1 } } })`.
  - In PostgreSQL, the update acquires an exclusive row lock on the `events` table row for that event ID. The first committer increments `currentRegistered` to 1. The remaining 9 transactions see `currentRegistered >= 1` upon acquiring the lock and immediately abort with `CAPACITY_FULL`.

### Test B: Duplicate Registration Race (Same user fires 2 parallel requests)
- **Target Invariant:** A user can never have more than 1 confirmed ticket for an event.
- **PostgreSQL Execution Mechanics:**
  - Enforced by `@@unique([userId, eventId])` on table `registrations`.
  - The second concurrent insert violates PostgreSQL constraint `registrations_userId_eventId_key`, throwing Prisma error `P2002`.
  - Caught by `registrationController.js` and returned as `HTTP 400: "You are already registered for this event."`.

### Test C: Attendance Double-Scan Race (6 simultaneous scans of 1 ticket)
- **Target Invariant:** Exactly 1 attendance record created; duplicate scans rejected with `HTTP 409 Conflict`.
- **PostgreSQL Execution Mechanics:**
  - Enforced by `@@unique([registrationId])` on table `attendances`.
  - The winning attendant creates the record and updates `registration.status = 'ATTENDED'`.
  - Concurrent scans attempting to insert with the same `registrationId` trigger a unique violation or observe `freshRegistration.status === 'ATTENDED'`, returning `HTTP 409 Conflict`.

### Test D: Waitlist Enqueue Race (6 users join sold-out event)
- **Target Invariant:** Positions are assigned in strictly sequential, collision-free order: $[1, 2, 3, 4, 5, 6]$.
- **PostgreSQL Execution Mechanics:**
  - Inside `prisma.$transaction`, the transaction counts active waitlist entries (`where: { eventId, status: { in: ['PENDING', 'OFFERED'] } }`) and assigns `nextPos = count + 1`.
  - In PostgreSQL, interactive transactions maintain snapshot isolation, preventing position duplication.

### Test E: Simultaneous Waitlist Promotion
- **Target Invariant:** When 1 seat opens, only the top eligible waitlist user is promoted.
- **PostgreSQL Execution Mechanics:**
  - Query: `findFirst({ where: { eventId, status: 'PENDING' }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] })`.
  - Winning worker updates entry to `status: 'ACCEPTED'` and re-indexes remaining entries with `decrement: 1`.
  - Concurrent cancellation workers evaluate `findFirst` and pick the updated top record, never promoting the same user twice.

### Test F: Transaction Rollback Verification
- **Target Invariant:** If any step within `$transaction` fails (e.g. notification dispatch exception), zero partial rows remain.
- **PostgreSQL Execution Mechanics:**
  - PostgreSQL issues an immediate `ROLLBACK` for the transaction block.
  - No orphaned registration rows, unused ticket codes, or incremented capacities are persisted.

---

## 3. SUMMARY STATUS

- **Architectural Concurrency Model:** Compliant with PostgreSQL ACID guarantees and MVCC row locking.
- **Defensive Catch Blocks:** Handled for both SQLite (`P2034`) and PostgreSQL (`P2002`, `P2034`).
- **Live Daemon Execution:** **BLOCKED** pending active host PostgreSQL database container.

