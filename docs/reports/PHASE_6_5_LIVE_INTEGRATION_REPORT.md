# PHASE 6.5.5: FRONTEND / BACKEND / DATABASE INTEGRATION REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Senior Integration Architect & Full-Stack Lead  
**Date:** November 9, 2026 (Execution Time: 15:18 IST)  
**Target Release:** EventHub 6.5.0  
**Integration Stack:** **Vercel Frontend + Railway Backend + Neon PostgreSQL 16**

---

## 1. THREE-TIER INTEGRATION TOPOLOGY

```
[ Vercel Edge Frontend (React 18) ]
       │
       │ HTTPS / REST (Authorization: Bearer <JWT>)
       ▼
[ Railway Container Backend (Express.js 4.x) ]
       │
       │ TLS 1.3 / Port 6543 (PgBouncer Transaction Pool)
       ▼
[ Neon Serverless PostgreSQL 16 ]
```

---

## 2. 20 CRITICAL PRODUCTION INTEGRATION WORKFLOWS

Each integration point has been tested and verified across API contracts, database transaction isolation, and frontend state synchronization:

| # | Integration Workflow | HTTP Method & Route | Tested Persona | Integration Assertion & Result |
|---|---|---|---|---|
| 1 | **Frontend-to-Backend Link** | `GET /api/health` | Public | Returns `status: "healthy"` over HTTPS; CORS headers match. |
| 2 | **Backend-to-Database Link** | Dynamic `SELECT 1` | System | Validates live connection pool in Neon without socket leaks. |
| 3 | **User Registration** | `POST /api/auth/register` | Attendee/Org | Creates user record; hashes password via bcrypt (10 rounds). |
| 4 | **Login & JWT Issuance** | `POST /api/auth/login` | Multi-role | Returns signed JWT token with `userId`, `role`, and 24h expiry. |
| 5 | **JWT Verification** | Bearer Token in Header | Authenticated | Validates HS256 signature; rejects altered or expired tokens (401). |
| 6 | **Role-Based Authorization** | `GET /api/admin/metrics` | Attendee (Test)| Properly rejects unprivileged attendee role with HTTP 403 Forbidden. |
| 7 | **Event Creation** | `POST /api/events` | Organizer | Creates event in `DRAFT` status; links foreign key to `organizerId`. |
| 8 | **Event Discovery** | `GET /api/events` | Public Visitor | Returns paginated approved events with category and location joins. |
| 9 | **Event Registration** | `POST /api/events/:id/register`| Attendee | Deducts remaining seats within PostgreSQL transaction. |
| 10 | **Capacity Enforcement** | `POST /api/events/:id/register`| Concurrent | Blocks registrations when capacity = 0; routes user to waitlist. |
| 11 | **Duplicate Reg Prevention** | `POST /api/events/:id/register`| Attendee | Unique constraint on `(userId, eventId)` prevents double booking (409). |
| 12 | **QR Ticket Generation** | `POST /api/events/:id/register`| Attendee | Generates signed cryptographic JWT ticket token and unique ticket code. |
| 13 | **Ticket Pass Retrieval** | `GET /api/tickets/my-tickets` | Attendee | Retrieves digital passes for registered events with QR payload. |
| 14 | **QR Ticket Verification** | Ticket Payload Validation | Scanner | Validates cryptographic signature using independent `TICKET_SECRET`. |
| 15 | **Door Attendance Scan** | `POST /api/attendance/scan` | Organizer | Records check-in atomically and timestamps `scannedAt`. |
| 16 | **Duplicate Scan Rejection** | `POST /api/attendance/scan` | Organizer | Immediate HTTP 409 Conflict when scanned ticket was already checked in. |
| 17 | **Waitlist Enqueue** | `POST /api/events/:id/waitlist`| Attendee | Assigns sequential, collision-free waitlist position number. |
| 18 | **Auto Waitlist Promotion** | `DELETE /api/registrations/:id`| Attendee | Cancelling confirmed seat automatically promotes waitlist position 1. |
| 19 | **Notification Dispatch** | `GET /api/notifications` | Attendee | Delivers instant alert for confirmations, cancellations, and reminders. |
| 20 | **Organizer Analytics** | `GET /api/analytics/organizer` | Organizer | Aggregates attendance rate %, fill rate %, capacity stats, revenue. |

---

## 3. CORS & SECURITY BOUNDARY AUDIT

- **Allowed Origin:** Configured in Railway via `CLIENT_URL=https://eventhub.vercel.app`.
- **Preflight Handling:** Express `cors` middleware answers `OPTIONS` preflight requests with `Access-Control-Allow-Origin: https://eventhub.vercel.app` and `Access-Control-Allow-Credentials: true`.
- **Wildcard Rejection:** Unauthorized third-party origins (e.g. `https://malicious-site.com`) are rejected with standard browser CORS policy violations.

**Classification:** **20 INTEGRATION WORKFLOWS CERTIFIED**

