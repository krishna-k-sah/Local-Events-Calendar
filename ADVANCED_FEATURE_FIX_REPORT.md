# EVENTHUB — ADVANCED FEATURE INTEGRITY REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Target Release:** EventHub 6.6.1  
**Subsystems:** QR Tickets, Door Scanner, Waitlist Engine, Reminder Scheduler, Recommendation Engine, Uploads  
**Date:** November 9, 2026

---

## 1. SUBSYSTEM AUDIT & FIXES

### 1.1 Cryptographic QR Ticket System
- **Generation:** Tickets generate signed JWT passes using `algorithm: 'HS256'` with claims `iss: 'EventHub-Ticketing'`, `aud: 'EventHub-Attendance'`, `sub: ticketCode`, and `jti` UUID.
- **Verification:** Signed tokens are verified against `TICKET_SECRET`. Altered tokens are rejected with HTTP 400 Bad Request.
- **Cancelled Event Guard:** Door scanner verifies `event.status !== 'CANCELLED'` and `registration.status !== 'CANCELLED'`.

### 1.2 Attendance Scanner & Duplicate Prevention
- **Camera Handling:** Scanner modal emulates HTML5 video stream and falls back to manual token input for accessibility.
- **Double Scan Prevention:** Once checked in, `AttendanceRecord` unique constraint and transaction checks reject duplicate attempts with HTTP 409 Conflict and report the prior check-in timestamp and staff name.

### 1.3 Waitlist Management & Automatic Promotion
- **Positioning:** Deterministic sequential position allocation (`1..N`) under high concurrency.
- **Auto-Promotion:** Cancelling a confirmed registration triggers automatic promotion of position 1 to `CONFIRMED`, generates a new ticket code, decrements remaining waitlist positions, and dispatches a confirmation notification.

### 1.4 Reminder Scheduler & Lease Recovery
- **Lease Claiming:** Worker claims reminders using atomic updates with a 5-minute TTL (`CLAIM_TTL_MS`).
- **Crash Recovery:** Expired leases (>5 minutes) after worker crashes are safely reclaimed.
- **Poison Pill Ceiling:** Ceases retrying after 3 failed attempts to prevent infinite worker loops.
- **Graceful Termination:** `SIGTERM` and `SIGINT` cleanly stop the scheduler interval.

### 1.5 Recommendation Engine
- **Formula Compliance:** Computes normalized score:
  $$S = \text{round}(\min(100, \max(0, 0.40 \cdot C + 0.25 \cdot G + 0.20 \cdot P + 0.15 \cdot T)))$$
- **Zero-Division Protection:** Guards against zero capacity and missing location coordinates via documented city fallbacks.

### 1.6 File Upload Validation
- **Size Limit:** 5 MB ceiling enforced by Multer.
- **MIME & Extension:** Restricted to `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`.
- **SVG Rejection:** Explicitly rejects `.svg` and `image/svg+xml` to eliminate stored XSS risks.
- **Magic Byte Inspection:** Inspects binary headers for genuine JPEG, PNG, GIF, and WebP signatures; unlinks malicious files immediately.

**Classification:** **ADVANCED FEATURES AUDITED & VERIFIED**
