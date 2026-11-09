# EventHub Phase 6.6.3.4 – Data Accuracy Report

**Project:** EventHub – Local Event Calendar Management System  
**Audit Phase:** Phase 6.6.3.4  
**Date:** 2026-11-09  
**Scope:** Mathematical formulas, telemetry models, data provenance, and prevention of fabricated data  

---

## 1. Principles of Data Provenance in EventHub

In EventHub Phase 6.6.3.4, a strict zero-fabrication policy is enforced across all analytics and reporting engines:
1. Every displayed count, percentage, chart point, and metric must trace directly to a PostgreSQL database record.
2. Under zero-denominator conditions (e.g., zero registrations, zero capacity), systems must calculate `0` or `0.00%` rather than returning `NaN`, `null`, or synthetic dummy figures.
3. For metrics requiring external telemetry that the platform does not currently capture (e.g., unique anonymous visitor page hits for conversion rate), the system must explicitly return `available: false` with a clear explanation, rather than simulating an artificial number.

---

## 2. Telemetry and Analytics Mathematical Formulas

### 2.1 Capacity Utilization Rate
- **Endpoint:** `GET /api/organizer/analytics`
- **Formula:**
  $$\text{Capacity Utilization} = \frac{\text{Active Registrations}}{\text{Total Event Capacity}} \times 100$$
- **Implementation:**
  ```javascript
  const capacity = event.capacity || 0;
  const activeRegistrations = event.registrations.filter(r => r.status === 'CONFIRMED').length;
  const utilizationRate = capacity > 0 ? Math.round((activeRegistrations / capacity) * 1000) / 10 : 0;
  ```
- **Zero-Division Guard:** When `capacity === 0`, returns `0%`.

### 2.2 Attendance / Check-In Rate
- **Endpoint:** `GET /api/organizer/analytics`
- **Formula:**
  $$\text{Attendance Rate} = \frac{\text{Unique Checked-In Attendees}}{\text{Confirmed Registrations}} \times 100$$
- **Implementation:**
  ```javascript
  const uniqueCheckIns = new Set(attendances.map(a => a.registrationId)).size;
  const attendanceRate = activeRegistrations > 0 
    ? Math.round((uniqueCheckIns / activeRegistrations) * 1000) / 10 
    : 0;
  ```
- **Zero-Division Guard:** When `activeRegistrations === 0`, returns `0%`.

### 2.3 Cancellation Rate
- **Endpoint:** `GET /api/organizer/analytics`
- **Formula:**
  $$\text{Cancellation Rate} = \frac{\text{Cancelled Registrations}}{\text{Total Registrations (Confirmed + Cancelled)}} \times 100$$
- **Zero-Division Guard:** When total registrations are `0`, returns `0%`.

### 2.4 Waitlist Promotion Rate
- **Endpoint:** `GET /api/organizer/analytics`
- **Formula:**
  $$\text{Promotion Rate} = \frac{\text{Promoted Waitlist Entries}}{\text{Total Waitlist Entries}} \times 100$$
- **Zero-Division Guard:** When total waitlist entries are `0`, returns `0%`.

### 2.5 Explicitly Disclosed Untracked Metrics
- **Metric:** Visitor-to-Registration Conversion Rate
- **Endpoint Response:**
  ```json
  {
    "registrationConversionRate": {
      "available": false,
      "value": null,
      "reason": "Requires page-level unique visitor tracking telemetry. Synthetic or estimated conversion values are forbidden in production."
    }
  }
  ```
- **Compliance:** Verified by test `tests/phase5_3_analytics.test.js` (Test 6: "should explicitly flag registrationConversionRate as unavailable with descriptive reason").

---

## 3. Dynamic Administrative Reporting Provenance

### 3.1 Six-Month Activity Aggregations
- In `server/src/controllers/adminController.js`, `getOverviewStats` calculates real database trends over the trailing 6 calendar months:
  ```javascript
  const monthlyTrends = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthName = startOfMonth.toLocaleString('en-US', { month: 'short' });

    const [eventsCount, regCount] = await Promise.all([
      prisma.event.count({ where: { createdAt: { gte: startOfMonth, lt: endOfMonth } } }),
      prisma.registration.count({ where: { createdAt: { gte: startOfMonth, lt: endOfMonth } } }),
    ]);

    monthlyTrends.push({ month: monthName, events: eventsCount, registrations: regCount });
  }
  ```
- No hardcoded numbers or dummy multipliers are used.

---

## 4. Synthetic Dataset Validation Suite Results

All formulas were subjected to synthetic dataset validation in `tests/phase5_3_analytics.test.js`:
- Capacity Utilization Test: 80 confirmed / 100 capacity = exactly 80.0% (PASSED)
- Attendance Rate Test: 20 check-ins / 80 confirmed = exactly 25.0% (PASSED)
- Cancellation Rate Test: 10 cancelled / 90 total = exactly 11.1% (PASSED)
- Waitlist Promotion Rate Test: 2 promoted / 4 eligible = exactly 50.0% (PASSED)
- Zero Denominator Safety Test: Event Zero returns 0.0% without NaN or Infinity (PASSED)
- Untracked Metric Transparency: Correctly returns `available: false` (PASSED)

---

## 5. Certification of Accuracy

Every mathematical calculation in EventHub Phase 6.6.3.4 is verified to be accurate, fully traceable to database rows, and compliant with production data integrity standards.
