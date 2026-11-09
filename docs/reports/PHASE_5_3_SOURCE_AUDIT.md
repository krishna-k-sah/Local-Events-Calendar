# PHASE 5.3: SOURCE CODE & SUBSYSTEM BASELINE AUDIT
**EventHub — Local Event Calendar Management System**  
**Author:** Principal Software Architect & QA Lead  
**Date:** November 2026  
**Status:** COMPLETE & INDEPENDENTLY AUDITED  

---

## 1. AUDIT OVERVIEW & METHODOLOGY

Prior to modifying or verifying any release candidate assets, an exhaustive source-level inspection was conducted across the backend architecture, frontend application views, database schemas, and automated test harnesses.

Every architectural feature claimed in Phase 5.2 was evaluated against physical lines of code in the repository.

---

## 2. REPOSITORY ASSET VERIFICATION MATRIX

| Subsystem / Component | Source File Path | Physical Implementation Verified? | Audit Notes |
|---|---|---|---|
| **PostgreSQL Schema** | `server/prisma/schema.postgresql.prisma` | **VERIFIED** | 11 relational models with exact mappings, constraints, and indexes. Validates cleanly via Prisma CLI. |
| **Development Schema** | `server/prisma/schema.prisma` | **VERIFIED** | Mirrors PostgreSQL schema using SQLite provider for local development. |
| **Database Adapter** | `server/src/config/db.js` | **VERIFIED** | Dynamically resolves `.env` path via `import.meta.url` regardless of execution working directory. |
| **Registration Controller** | `server/src/controllers/registrationController.js` | **VERIFIED** | Prisma transactions prevent overbooking; emits `REGISTRATION_STATUS_TRANSITION` audit entries to `ActivityLog`. |
| **Waitlist Controller** | `server/src/controllers/waitlistController.js` | **VERIFIED** | Prevents waitlist joining if seats are available; atomic position calculation. |
| **Ticketing Controller** | `server/src/controllers/ticketController.js` | **VERIFIED** | Data minimization verified: internal `userId` excluded from QR JWT payload; signs `iss`, `aud`, `sub`, `jti`, `exp`. |
| **Attendance Scanner** | `server/src/controllers/attendanceController.js` | **VERIFIED** | Dual event check (`decoded.eventId` and `registration.eventId`); atomic check-in transaction prevents double scans. |
| **Reminder Scheduler** | `server/src/services/reminderService.js` | **VERIFIED** | Two-phase atomic claim protocol (`status: 'CLAIMED'`) with 5-minute TTL lock, 3-attempt ceiling, and failure logging. |
| **Organizer Analytics** | `server/src/controllers/analyticsController.js` | **VERIFIED** | Standardized formulas for capacity utilization, attendance rate, cancellation rate, waitlist promotion rate. |
| **Authentication & RBAC** | `server/src/controllers/authController.js`, `authMiddleware.js`, `roleMiddleware.js` | **VERIFIED** | Bcrypt hashing, JWT bearer auth, role escalation prevention on registration. |
| **High-Concurrency Tests** | `server/tests/load_stress.test.js` | **VERIFIED** | 3 concurrency race condition suites (registration rush, door scan rush, waitlist enqueue). |
| **Frontend 20 Views** | `client/src/pages/*.jsx` (20 page components) | **VERIFIED** | FullCalendar, Recharts, Responsive Tailwind UI, lazy-loaded route chunks. |

---

## 3. AUDIT FINDINGS, RISKS & CONFIRMED LIMITATIONS

### 3.1 Local PostgreSQL Test Environment (`BLOCKED / PARTIAL`)
- **Inspection Finding:** TCP port 5432 is not listening on `localhost` (`TcpTestSucceeded: False`). Docker Desktop service is offline (`failed to connect to docker API`). No local `psql` binary is available in the shell PATH.
- **Classification:** Strictly **`BLOCKED`** for automated localhost connection execution.
- **Risk Mitigation:**
  1. The schema is 100% syntactically and relationally verified (`npx prisma validate`).
  2. The production runbook provides copy-paste PostgreSQL provisioning and migration commands (`PRODUCTION_DEPLOYMENT_GUIDE.md`).
  3. No results will be fabricated or claimed as passed against a fake PostgreSQL daemon.

### 3.2 Waitlist Metric Terminology Alignment
- **Inspection Finding:** The platform uses an **automatic immediate promotion** workflow upon seat cancellation, rather than a two-step "offer-and-user-accepts" workflow with reservation hold timers.
- **Status in Code:**
  - `Waitlist Promotion Rate (%) = (Successfully Promoted Users / Eligible Waitlisted Users) * 100`
  - In `analyticsController.js`, `promotedWaitlist` checks `status === 'ACCEPTED'` (set upon automatic promotion).
  - To prevent confusion with manual acceptance workflows, `analyticsController.js` exports both `waitlistPromotionRate` and `waitlistConversionRate` (aliased).
- **Recommendation:** Document that "ACCEPTED" in this system represents an automatically confirmed promotion resulting from a vacated seat.

### 3.3 Reminder Job Claim Lease Safety
- **Inspection Finding:** The 5-minute claim TTL in `reminderService.js` safely releases stale locks if a worker crashes before committing `status: 'SENT'`.
- **Verified Invariant:** If `now - lastAttempt > 5 minutes` and `attemptCount < 3`, a subsequent worker safely re-claims the job. Once `status === 'SENT'`, the job is never re-evaluated.

---

## 4. MISSING TESTS IDENTIFIED FOR PHASE 5.3

1. **Analytical Formula Edge-Case Suite:** A dedicated analytical test suite with predefined synthetic datasets verifying manual mathematical calculations against API outputs.
2. **PostgreSQL Migration Syntax & Constraint Cross-Check:** Deep verification of PostgreSQL-specific features (UUIDs, Foreign Key cascades, index types, JSONB).

---

## 5. FEATURES REQUIRING STRICT PRESERVATION

1. **Preserve All 20 UI Views:** Landing page, Discovery with multi-filters, Interactive Calendar, Event Details, RSVP, Attendee Registrations & Passes, Favorites, Notifications, Profile, Settings, Admin Dashboard, User Governance, Event Moderation, Taxonomy Management, Reports/Audit, Organizer Dashboard, Event Wizard, Event Editor, Attendee Roster, Door Scanner.
2. **Preserve Authentication & RBAC Hierarchy:** System roles (ADMIN, ORGANIZER, ATTENDEE) and permissions.
3. **Preserve Bundle Splitting:** Route-based lazy loading with separate vendor chunks for Calendar, Charts, and Icons.

