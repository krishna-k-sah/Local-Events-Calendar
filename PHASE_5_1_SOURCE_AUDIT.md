# PHASE 5.1: SOURCE CODE AUDIT REPORT
## Local Event Calendar Management System (EventHub)

**Audit Date:** 2026-11-09  
**Auditor:** Principal Software Engineer, Application Security Specialist & Systems Architect  
**Scope:** Exhaustive inspection of Phase 4.2 & Phase 5 backend services, controllers, database models, algorithms, and frontend components.

---

## 1. Executive Summary

A comprehensive source inspection was conducted across all backend endpoints, Prisma schema definitions, database queries, mathematical formulas, and React components. The overall architecture is robust, built with modern standards, and completely avoids mock replacements. However, several critical security enhancements, formula standardizations, and concurrency edge cases must be hardened for enterprise production readiness:

1. **QR Token Security Hardening**: The signed JWT token lacked standard audience (`aud: EventHub-Attendance`), subject (`sub: ticketCode`), and token identifier (`jti`) claims, as well as strict algorithm checking (`algorithms: ['HS256']`) and production secret enforcement.
2. **Attendance Scanner Race Condition Handling**: While the database uniqueness constraint `@@unique([eventId, ticketCode])` properly prevents duplicate check-ins, a database-level race condition currently bubbles up as an unhandled Prisma error (`P2002`) returning HTTP 500 rather than an explicit HTTP 409 Conflict with structured duplicate metadata.
3. **Waitlist Determinism & Atomic Promotion Ordering**: Waitlist queue ordering must explicitly break ties with `createdAt ASC, id ASC`, and the position calculation upon joining must occur within a transaction.
4. **Automated Reminders Background Worker & Schema**: Reminder tracking lacks attempt counts, last attempt timestamps, and failure reasons in the database model, and requires a dedicated automated interval worker that starts with the server process.
5. **Personalized Recommendations Mathematical Normalization**: The existing scoring used heuristic additions rather than the strict, normalized formula $S = 0.40C + 0.25G + 0.20P + 0.15T$ with Haversine distance calculations.
6. **Organizer Analytics Standardization**: Missing formalized cancellation rate, waitlist conversion rate, and explicit documentation of unavailable web traffic conversions.

---

## 2. Detailed Findings Register

### Finding AUD-51-01: QR Ticket Token Security & Claims Incompleteness
- **Severity:** High (Security)
- **File & Function:** `server/src/controllers/ticketController.js` (`generateTicketToken`, `verifyTicketToken`)
- **Defect:** 
  1. The JWT token does not encode `aud` (Audience: `EventHub-Attendance`), `sub` (Subject: `ticketCode`), or `jti` (JWT ID for replay detection).
  2. The verification function `verifyTicketToken` does not enforce `issuer: 'EventHub-Ticketing'`, `audience: 'EventHub-Attendance'`, or `algorithms: ['HS256']`.
  3. The signing secret falls back to a default development string even in production mode if `JWT_SECRET` is omitted.
- **Reproduction:** Issue a token with mismatched issuer/audience or forge a token with `'none'` algorithm; the verifier would accept it if validly signed without audience validation.
- **Recommended Fix:** 
  - Standardize token payload: `{ ticketCode, eventId, userId, iss: 'EventHub-Ticketing', aud: 'EventHub-Attendance', sub: ticketCode, jti: crypto.randomUUID() }`.
  - Pass strict verification options `{ algorithms: ['HS256'], issuer: 'EventHub-Ticketing', audience: 'EventHub-Attendance' }`.
  - Enforce that `JWT_SECRET` must be set in production mode, throwing a fatal error on boot if missing.
- **Verification Test:** Unit test in `server/tests/phase5_1.test.js` verifying rejection of wrong audience, wrong issuer, forged signature, and algorithm spoofing.

---

### Finding AUD-51-02: Concurrent Attendance Scans Bubble as 500 Instead of 409 Conflict
- **Severity:** Medium (Correctness / User Experience)
- **File & Function:** `server/src/controllers/attendanceController.js` (`scanTicket`)
- **Defect:** When two scanning devices scan the exact same QR ticket simultaneously within the same millisecond, the first transaction commits while the second encounters a database constraint violation on `Attendance (eventId, ticketCode)`. Prisma throws code `P2002`, which is caught by the generic catch block and passed to `next(error)`, resulting in HTTP 500 Internal Server Error rather than an informative HTTP 409 Conflict.
- **Reproduction:** Fire two simultaneous `POST /api/attendance/scan` requests with the same `ticketCode` using `Promise.all`.
- **Recommended Fix:** Catch Prisma error `P2002` on `Attendance` inside the error handler and return HTTP 409 with `{ success: false, duplicate: true, message: 'DUPLICATE SCAN DETECTED: Ticket already checked in.' }`.
- **Verification Test:** Concurrency test sending simultaneous duplicate scans asserting HTTP 200 for the first and HTTP 409 for the second.

---

### Finding AUD-51-03: Waitlist Join Race Condition & Deterministic Ordering
- **Severity:** Medium (Concurrency & Queue Integrity)
- **File & Function:** `server/src/controllers/waitlistController.js` (`joinWaitlist`) and `server/src/controllers/registrationController.js` (`cancelRegistration`)
- **Defect:** 
  1. In `joinWaitlist`, `count()` and `create()` are performed in separate non-transactional statements, which under high concurrency can assign duplicate position numbers.
  2. In `cancelRegistration`, the waitlist lookup sorts only by `position: 'asc'`. If a tie ever occurred, promotion ordering could be nondeterministic.
- **Reproduction:** Two users join waitlist at the identical timestamp for a sold-out event.
- **Recommended Fix:** 
  - Wrap waitlist position calculation and creation in `prisma.$transaction`.
  - Apply deterministic multi-column sorting: `orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }]`.
- **Verification Test:** Concurrency test simulating multiple simultaneous waitlist joins and cancellations.

---

### Finding AUD-51-04: Background Reminder Service Lifecycle & Audit Columns
- **Severity:** High (Reliability & Lifecycle Management)
- **File & Function:** `server/src/services/reminderService.js` and `server/prisma/schema.prisma` (`EventReminder`)
- **Defect:** 
  1. The server currently requires manual invocation of `POST /api/reminders/trigger` or an external cron runner; no internal background scheduler starts on application boot.
  2. The `EventReminder` model only tracks `id`, `eventId`, `userId`, `reminderType`, `scheduledFor`, `sentAt`, `status`, but lacks `attemptCount`, `lastAttempt`, and `failureReason` to track retries.
  3. No graceful shutdown hook (`SIGTERM`/`SIGINT`) exists to clear background reminder timers.
- **Reproduction:** Start server and leave it running for 24 hours without external HTTP calls; no reminders are dispatched automatically.
- **Recommended Fix:** 
  - Add fields `attemptCount Int @default(0)`, `lastAttempt DateTime?`, and `failureReason String?` to `EventReminder`.
  - Provide `startReminderScheduler(intervalMs)` and `stopReminderScheduler()` with process signal listeners in `server.js`.
  - Exclude cancelled events and cancelled registrations from reminder evaluation.
- **Verification Test:** Unit test for scheduler execution, retry tracking, and lifecycle start/stop.

---

### Finding AUD-51-05: Non-Normalized Recommendation Scoring & Missing Haversine Formula
- **Severity:** High (Mathematical Rigor & Accuracy)
- **File & Function:** `server/src/controllers/recommendationController.js` (`getPersonalizedRecommendations`)
- **Defect:** The existing recommendation engine uses arbitrary point weights (e.g., `+10 baseline, +min(40, cat*10), +25, +20, +15`) resulting in non-standardized scores, and lacks Haversine geographic distance calculation when coordinates are present.
- **Reproduction:** Run `/api/recommendations` on events with varying parameters; total scores exceed 100 or fail to reflect the defined mathematical specification.
- **Recommended Fix:** 
  - Implement standardized formula:
    $$S = 0.40C + 0.25G + 0.20P + 0.15T$$
    where $C = \min(100, 3B + 2F)$, $G = 100 \times \max(0, 1 - d/D)$ (Haversine distance or documented city fallback), $P = \min(100, \text{Fill Ratio})$, $T = 100 \times \max(0, 1 - \Delta t / 10)$.
  - Strictly enforce $0 \le S \le 100$.
- **Verification Test:** Unit test with known mock inputs asserting exact mathematical score values.

---

### Finding AUD-51-06: Organizer Analytics Formulas & Rate Definitions
- **Severity:** Medium (Standardization & Consistency)
- **File & Function:** `server/src/controllers/analyticsController.js` (`getOrganizerAnalytics`)
- **Defect:** 
  1. Analytics endpoint calculates capacity utilization and attendance rate, but omits `cancellationRate` and `waitlistConversionRate`.
  2. Web registration conversion is not mentioned or explicitly documented as unavailable due to the absence of web visitor tracking.
- **Reproduction:** Inspect `/api/organizer/analytics` response payload; cancellation rate and waitlist conversion are absent.
- **Recommended Fix:** 
  - Standardize all 5 formula definitions.
  - Compute `cancellationRate = (cancelledCount / totalRegistrations) * 100` and `waitlistConversionRate = (promotedCount / totalWaitlisted) * 100`.
  - Return `{ available: false, reason: "Unique page visitor tracking not implemented" }` for web registration conversion.
- **Verification Test:** Test verifying exact analytics calculations and edge case handling (0 capacity, 0 attendees).

---

## 3. Audit Action Plan

| Finding ID | Planned Remediation | Target File(s) | Status |
| :--- | :--- | :--- | :---: |
| AUD-51-01 | Add `aud`, `sub`, `jti`, strict algorithm verification & env secrets | `ticketController.js`, `jwt.js` | Pending |
| AUD-51-02 | Catch duplicate scan `P2002` concurrency conflict & return 409 | `attendanceController.js` | Pending |
| AUD-51-03 | Deterministic queue ordering & transactional waitlist joins | `waitlistController.js`, `registrationController.js` | Pending |
| AUD-51-04 | Add retry columns to `EventReminder`, background scheduler worker | `schema.prisma`, `reminderService.js`, `server.js` | Pending |
| AUD-51-05 | Implement normalized $S = 0.40C + 0.25G + 0.20P + 0.15T$ with Haversine | `recommendationController.js` | Pending |
| AUD-51-06 | Standardize analytics formulas with zero-division guards | `analyticsController.js` | Pending |

