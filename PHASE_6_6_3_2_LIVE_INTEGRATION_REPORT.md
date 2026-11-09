# PHASE 6.6.3.2 — LIVE FULL-STACK INTEGRATION REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.2  
**Test Target:** Deployed Cloud URLs (Vercel Frontend + Railway Backend + Neon DB)  
**Status:** **24-POINT INTEGRATION PROTOCOL SPECIFIED — PENDING DEPLOYMENT ACTIVATION**

---

## 1. Verification Protocol & Execution Matrix

This matrix establishes the mandatory 24-point end-to-end verification protocol to be executed against real cloud endpoints immediately upon deployment completion:

| # | Workflow / Invariant | Target Endpoint | Verification Method | Status |
|---|---|---|---|---|
| **1** | Frontend Ingress | `https://[VERCEL_URL]` | Browser navigation, HTTP 200, FCP < 1.0s | PENDING CLOUD URL |
| **2** | Attendee Registration | `POST /api/auth/register` | Create dedicated test account | PENDING CLOUD URL |
| **3** | Authentication & JWT | `POST /api/auth/login` | Return signed JWT, verify localStorage | PENDING CLOUD URL |
| **4** | User Dashboard | `GET /api/auth/me` | Hydrate attendee profile & bookmarks | PENDING CLOUD URL |
| **5** | Public Discovery Grid | `GET /api/events` | Multi-category filter & search query | PENDING CLOUD URL |
| **6** | Event Details Loading | `GET /api/events/:id` | Hydrate organizer info, ticket pricing | PENDING CLOUD URL |
| **7** | Organizer Event Creation | `POST /api/events` | Multi-step wizard, date validation | PENDING CLOUD URL |
| **8** | Event Editing (Owner) | `PUT /api/events/:id` | Update description, atomic DB commit | PENDING CLOUD URL |
| **9** | Ownership Guard | `PUT /api/events/:id` | Foreign organizer rejected (403 Forbidden) | PENDING CLOUD URL |
| **10** | Ticket Registration | `POST /api/events/:id/register` | Atomic capacity decrement | PENDING CLOUD URL |
| **11** | Capacity Restrictions | `POST /api/events/:id/register` | Reject bookings once sold out (400) | PENDING CLOUD URL |
| **12** | Duplicate Rejection | `POST /api/events/:id/register` | Re-booking returns 409 Conflict | PENDING CLOUD URL |
| **13** | QR Ticket Pass Render | `GET /api/tickets/:code` | Canvas rendering of HMAC-signed QR | PENDING CLOUD URL |
| **14** | Ticket Signature Verification | `POST /api/attendance/scan` | Tamper-evident SHA-256 verification | PENDING CLOUD URL |
| **15** | Valid Door Check-in | `POST /api/attendance/scan` | Record attendance timestamp (200 OK) | PENDING CLOUD URL |
| **16** | Double-Checkin Guard | `POST /api/attendance/scan` | Second scan rejected (400 Already checked in) | PENDING CLOUD URL |
| **17** | Waitlist Enqueue | `POST /api/events/:id/waitlist` | Sequential position allocation | PENDING CLOUD URL |
| **18** | Waitlist Auto-Promotion | `DELETE /api/events/:id/register` | Promotion of position #1 on cancellation | PENDING CLOUD URL |
| **19** | System Notifications | `GET /api/notifications` | Delivery of booking/waitlist notification | PENDING CLOUD URL |
| **20** | Reactive Favorites | `POST /api/events/:id/favorite` | Bookmark toggle & list sync | PENDING CLOUD URL |
| **21** | Organizer Analytics | `GET /api/organizer/analytics` | Recharts revenue & attendance metrics | PENDING CLOUD URL |
| **22** | Admin Moderation Access | `GET /api/admin/events/pending` | Non-admin blocked (403); Admin allowed | PENDING CLOUD URL |
| **23** | User Data Isolation | `GET /api/registrations/my` | User views only their personal tickets | PENDING CLOUD URL |
| **24** | Session Invalidation | `POST /api/auth/logout` | Token cleared, protected route redirects to `/login` | PENDING CLOUD URL |

---

## 2. Test Data Isolation & Cleanup Policy

To prevent cluttering production tables:
- Dedicated test accounts will use the tag `test-smoke-[timestamp]@eventhub-audit.internal`.
- All created test events will be marked with category `Test` or removed via `DELETE /api/events/:id` upon test run completion.
- No dummy seed fixtures will be permanently retained in the production database.
