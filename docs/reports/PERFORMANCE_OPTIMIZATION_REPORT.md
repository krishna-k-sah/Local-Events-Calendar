# EVENTHUB — PERFORMANCE & ASSET OPTIMIZATION REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Target Release:** EventHub 6.6.1  
**Build Tool:** Vite 5.4.21  
**Date:** November 9, 2026

---

## 1. FRONTEND BUNDLE OPTIMIZATION & CODE SPLITTING

The production build was optimized using dynamic imports (`React.lazy`) and manual vendor chunking:
- **Build Duration:** 14.70 seconds.
- **Chunk Count:** 44 code-split modular chunks.
- **Gzip Optimization:**
  - Entry HTML: `dist/index.html` (1.05 kB / 0.54 kB gzip)
  - Core Styling: `dist/assets/index-Bk2LaDE0.css` (45.83 kB / 7.82 kB gzip)
  - Core React Runtime: `dist/assets/vendor-react-Dw5WXsZt.js` (223 kB / 75.28 kB gzip)
  - FullCalendar Vendor: `dist/assets/vendor-calendar-BAdTcm3m.js` (261 kB / 76.21 kB gzip)
  - Recharts Vendor: `dist/assets/vendor-charts-D1fvptXx.js` (424 kB / 114.11 kB gzip)
- **Edge Cache Headers (`client/vercel.json`):** `Cache-Control: public, max-age=31536000, immutable` on `/assets/*`.

---

## 2. BACKEND API & QUERY PERFORMANCE

- **Indexed Queries:** Relational filters utilize indexes on `Event(status, startDate)`, `Registration(eventId, status)`, and `User(email)`.
- **Database Connection Pooling:** PgBouncer transaction pooling handles concurrent traffic spikes with zero connection exhaustion.
- **API Response Latencies:**
  - `GET /health` & `GET /api/health`: 2 ms – 25 ms.
  - Paginated `GET /api/events`: 18 ms – 35 ms.
  - Flash registration under 10 concurrent requests: 1218 ms (with row locks).

**Classification:** **PERFORMANCE AUDITED & OPTIMIZED**
