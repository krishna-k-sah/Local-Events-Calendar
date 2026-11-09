# PHASE 6.6.3.3 — LIVE FULL-STACK INTEGRATION REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.3  
**Target Infrastructure:** Deployed Cloud URLs (Vercel Frontend + Railway Backend + Neon DB)  
**Status:** **24-POINT PROTOCOL PREPARED — PENDING CLOUD ACTIVATION**

---

## 1. 24-Point Live Integration Verification Protocol

This protocol will be executed against the live cloud URLs immediately upon deployment:

| # | Workflow / Invariant | Method & Endpoint | Pass Criteria | Status |
|---|---|---|---|---|
| **1** | Frontend Ingress | Browser GET `/` | HTTP 200, FCP < 1.0s, hero rendered | PENDING LIVE URL |
| **2** | Backend Health Check | GET `/health` | HTTP 200 `{"status":"healthy","database":"connected"}` | PENDING LIVE URL |
| **3** | Database Query Probe | GET `/api/health` | Neon `SELECT 1` returns < 50ms latency | PENDING LIVE URL |
| **4** | Attendee Registration | POST `/api/auth/register` | Unique attendee created, bcrypt hash stored | PENDING LIVE URL |
| **5** | Attendee Login | POST `/api/auth/login` | Signed JWT returned, saved to localStorage | PENDING LIVE URL |
| **6** | User Authentication Guard | GET `/api/auth/me` | Valid Bearer token hydrates user profile | PENDING LIVE URL |
| **7** | Public Event Discovery | GET `/api/events` | Paginated event list returned | PENDING LIVE URL |
| **8** | Event Details Loading | GET `/api/events/:id` | Event metadata, organizer, and tiers loaded | PENDING LIVE URL |
| **9** | Organizer Event Creation | POST `/api/events` | Multi-step form submitted, saved in Neon DB | PENDING LIVE URL |
| **10** | Organizer Event Editing | PUT `/api/events/:id` | Event updated by owner, commit confirmed | PENDING LIVE URL |
| **11** | Ownership Security Guard | PUT `/api/events/:id` | Foreign organizer update rejected (403) | PENDING LIVE URL |
| **12** | Event Registration | POST `/api/events/:id/register` | Atomic capacity decrement in PostgreSQL | PENDING LIVE URL |
| **13** | Duplicate Registration Guard | POST `/api/events/:id/register` | Re-registration rejected with 409 Conflict | PENDING LIVE URL |
| **14** | Capacity Overflow Guard | POST `/api/events/:id/register` | Sold-out event registration rejected (400) | PENDING LIVE URL |
| **15** | Digital QR Ticket Pass | GET `/api/tickets/:code` | HMAC SHA-256 signed ticket pass rendered | PENDING LIVE URL |
| **16** | Ticket Integrity Verification | POST `/api/attendance/scan` | Valid QR code signature verified | PENDING LIVE URL |
| **17** | Door Attendance Check-in | POST `/api/attendance/scan` | Check-in timestamp recorded atomically | PENDING LIVE URL |
| **18** | Duplicate Check-in Guard | POST `/api/attendance/scan` | Second scan rejected (400 Already checked in) | PENDING LIVE URL |
| **19** | Waitlist Enqueue | POST `/api/events/:id/waitlist` | Sequential position allocated in FIFO order | PENDING LIVE URL |
| **20** | Waitlist Auto-Promotion | DELETE `/api/events/:id/register` | Position #1 promoted to registered status | PENDING LIVE URL |
| **21** | System Notifications | GET `/api/notifications` | Delivery of registration notification | PENDING LIVE URL |
| **22** | Reactive Favorites Sync | POST `/api/events/:id/favorite` | Favorite toggled and synchronized in UI | PENDING LIVE URL |
| **23** | Analytics Telemetry | GET `/api/organizer/analytics` | Recharts charts display valid metrics | PENDING LIVE URL |
| **24** | Admin Moderation Access | GET `/api/admin/events/pending` | RBAC blocks non-admin, allows Admin | PENDING LIVE URL |

---

## 2. Test Data Isolation & Cleanup Protocol

- All smoke test accounts will use the designated domain: `@eventhub-audit.internal`.
- All test events created during live verification will be explicitly deleted at the conclusion of the test run (`DELETE /api/events/:id`).
- Zero unmonitored test fixtures will be left in the production database.
