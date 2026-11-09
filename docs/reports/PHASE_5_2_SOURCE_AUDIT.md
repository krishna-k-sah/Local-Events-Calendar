# PHASE 5.2: SOURCE CODE AUDIT REPORT
## Local Event Calendar Management System (EventHub)

**Audit Date:** 2026-11-09  
**Auditor:** Principal Software Engineer, Database Architect & Application Security Specialist  
**Scope:** In-depth audit of Phase 5.1 code, database models, transaction lifecycles, analytics queries, multi-instance concurrency, and production deployment readiness.

---

## 1. Executive Summary

An exhaustive inspection of the actual source code was conducted to identify any remaining defects, potential race conditions, mathematical edge cases, and deployment constraints before production release. 

### Key Findings Summary:
1. **PostgreSQL Real-World Connectivity Limitation:** The PostgreSQL schema is syntactically valid, but local execution remains blocked because neither a local PostgreSQL daemon (port 5432) nor an active Docker Desktop engine daemon is running in this workstation environment.
2. **Registration Lifecycle & Cancellation History Integrity:** In `cancelRegistration`, when a previously cancelled attendee is promoted from the waitlist, updating their existing `Registration` row directly erases the previous cancellation timestamp, skewing historical cancellation rate metrics unless an immutable audit trail is maintained.
3. **Waitlist Analytics Formula Alignment:** The waitlist conversion metric in `analyticsController.js` previously referenced "users offered a seat". Under the verified Immediate Auto-Confirmation model, the metric must be formalized as **Waitlist Promotion Rate**:
   $$\text{Waitlist Promotion Rate (\%)} = \left(\frac{\text{Successfully Promoted Users}}{\text{Eligible Waitlisted Users}}\right) \times 100$$
4. **Reminder Scheduler Multi-Instance Worker Race Prevention:** In multi-replica server environments, two server instances could concurrently query due reminders and attempt redundant deliveries. A stateful atomic job-claiming mechanism (`status: 'CLAIMED' / 'PROCESSING'`) is required.
5. **QR Payload Privacy Hardening:** The signed JWT token currently includes internal `userId` in its claims. Removing `userId` prevents internal database identifier leakage in public QR scans while relying on trusted server-side relational lookups.

---

## 2. Detailed Findings Register

### Finding AUD-52-01: Multi-Replica Reminder Job Claiming & Concurrency Race
- **Severity:** High (Reliability & Multi-Instance Safety)
- **File & Function:** `server/src/services/reminderService.js` (`processEventReminders`)
- **Defect:** If multiple backend containers or Node.js clustering processes execute `processEventReminders` at the same scheduled interval, both instances retrieve the same list of upcoming events and registrations. Without atomic job claiming, redundant database transactions and duplicate notifications could be dispatched before the status flips to `SENT`.
- **Recommended Fix:** Implement an atomic two-phase claim pattern:
  1. Transaction attempts to claim the reminder by inserting an `EventReminder` record with `status: 'CLAIMED'` and `lastAttempt: new Date()`.
  2. If unique constraint `(eventId, userId, reminderType)` exists, check if `status` is already `SENT` or `CLAIMED` (within active timeout window). If claimed by another worker, skip.
  3. Once notification dispatch succeeds, atomically finalize `status: 'SENT'`.
- **Verification Test:** Concurrency test with simulated parallel workers processing the same queue simultaneously.

---

### Finding AUD-52-02: Registration Cancellation History Overwrite on Waitlist Promotion
- **Severity:** High (Data Integrity & Historical Analytics Accuracy)
- **File & Function:** `server/src/controllers/registrationController.js` (`cancelRegistration`)
- **Defect:** Under the `@@unique([userId, eventId])` constraint on `Registration`, when a user who previously cancelled is promoted from the waitlist, the code executed `tx.registration.update` resetting `cancelledAt: null` and `status: 'CONFIRMED'`. This overwrites historical cancellation data, reducing the historical cancelled count and causing historical `cancellationRate` to report inaccurate metrics.
- **Recommended Fix:**
  - Create a dedicated registration status transition audit record in `ActivityLog` or `RegistrationTransition` capturing:
    `{ registrationId, eventId, userId, fromStatus, toStatus, timestamp, reason, actorId }`.
  - In `analyticsController.js`, count total historical cancellation events from the immutable audit logs rather than relying on current snapshot status alone.
- **Verification Test:** Integration test verifying that a user who cancels, joins waitlist, and is promoted preserves the historical cancellation count in analytics.

---

### Finding AUD-52-03: Formula Alignment for Waitlist Promotion Rate
- **Severity:** Medium (Analytics Standardisation)
- **File & Function:** `server/src/controllers/analyticsController.js` (`getOrganizerAnalytics`)
- **Defect:** The metric was named `waitlistConversionRate` and calculated based on `offeredOrAcceptedWaitlist`. Under the immediate auto-confirmation model, there is no manual acceptance stage; promoted attendees receive confirmed tickets immediately.
- **Recommended Fix:** Standardize metric as **Waitlist Promotion Rate**:
  $$\text{Waitlist Promotion Rate (\%)} = \left(\frac{\text{Successfully Promoted Users}}{\text{Eligible Waitlisted Users}}\right) \times 100$$
  where Eligible Waitlisted Users = Total users who joined the waitlist and did not manually leave before a seat opened (`ACCEPTED` + `PENDING`).
- **Verification Test:** Analytics test validating exact mathematical calculation and edge-case handling (0 waitlisted).

---

### Finding AUD-52-04: QR Ticket Internal Identifier Minimization
- **Severity:** Medium (Privacy & Data Minimization)
- **File & Function:** `server/src/controllers/ticketController.js` (`generateTicketToken`)
- **Defect:** `generateTicketToken` includes `{ userId }` inside the JWT payload. Anyone scanning the QR code with a generic QR scanner app can decode the base64 payload and inspect the internal database User CUID.
- **Recommended Fix:** Remove `userId` from the token payload. The token payload only contains `{ ticketCode, eventId }` along with cryptographic claims (`iss`, `aud`, `sub: ticketCode`, `jti`, `exp`). The server resolves the attendee and user details securely through the database relation `prisma.registration.findUnique({ where: { ticketCode } })`.
- **Verification Test:** Verify generated token payload does not contain `userId` while remaining 100% functional for scanning.

---

### Finding AUD-52-05: Real-World PostgreSQL Daemon Absence
- **Severity:** Informational / Environment Limitation
- **File:** `server/prisma/schema.postgresql.prisma`
- **Defect:** The production schema is fully validated and ready, but cannot execute against a live PostgreSQL daemon because localhost:5432 is not running and Docker Desktop daemon is offline on this workstation.
- **Recommended Fix:** Fully document the status as **PARTIAL / BLOCKED** in `PHASE_5_2_POSTGRESQL_INTEGRATION_REPORT.md` with complete, reproducible CLI instructions for connecting to Cloud SQL / Neon / Supabase / RDS.

---

## 3. Remediation Action Plan

| Finding ID | Planned Action | Target Files | Status |
| :--- | :--- | :--- | :---: |
| AUD-52-01 | Implement atomic two-phase reminder claiming (`CLAIMED` -> `SENT`) | `reminderService.js` | Pending |
| AUD-52-02 | Add registration lifecycle audit logs & preserve historical cancellation counts | `registrationController.js`, `analyticsController.js` | Pending |
| AUD-52-03 | Standardize Waitlist Promotion Rate formula | `analyticsController.js` | Pending |
| AUD-52-04 | Remove `userId` from QR ticket token payload | `ticketController.js`, `attendanceController.js` | Pending |
| AUD-52-05 | Document PostgreSQL integration guide & blocked environment status | `PHASE_5_2_POSTGRESQL_INTEGRATION_REPORT.md` | Pending |

