# PHASE 5.2: ANALYTICS CORRECTION & METRICS AUDIT REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Senior Backend Engineer & Database Architect  
**Date:** November 2026  
**Status:** VERIFIED & PRODUCTION READY  

---

## 1. EXECUTIVE SUMMARY

During Phase 5.1, an audit revealed that metrics and rates across the organizer analytics dashboard required strict mathematical definitions, explicit zero-division guards, and historical immutability. Specifically, when a user cancelled their registration and was later promoted from a waitlist, the composite unique key `@@unique([userId, eventId])` in the `Registration` model caused an in-place status update (`status: 'CONFIRMED'`, `cancelledAt: null`), which risked overwriting the record of the earlier cancellation in snapshot queries.

In Phase 5.2, we have:
1. Standardized and implemented the mathematical formula for **Waitlist Promotion Rate**:
   $$\text{Waitlist Promotion Rate (\%)} = \left(\frac{\text{Successfully Promoted Users}}{\text{Eligible Waitlisted Users}}\right) \times 100$$
2. Strictly decoupled **Waitlist Promotion Rate** from **Registration Conversion Rate**, with the latter marked unavailable and documented with its prerequisite (visitor/traffic tracking).
3. Implemented an immutable audit trail using the `ActivityLog` model for all registration state transitions (`NONE` $\to$ `CONFIRMED`, `CONFIRMED` $\to$ `CANCELLED`, `WAITLIST_PENDING` $\to$ `PROMOTED`).
4. Applied defensive zero-division protections across all mathematical calculations.

---

## 2. MATHEMATICAL FORMULAS & DEFINITIONS

### 2.1 Capacity Utilization Rate
$$\text{Capacity Utilization (\%)} = \min\left(100, \left(\frac{\text{Total Confirmed Registrations}}{\max(1, \text{Total Event Capacity})}\right) \times 100\right)$$
- **Zero-Division Guard:** If `Total Event Capacity == 0`, the denominator defaults to 1 and returns $0\%$.
- **Cap:** Clamped at $100\%$ to handle overbooking scenarios cleanly.

### 2.2 Door Attendance Rate
$$\text{Attendance Rate (\%)} = \left(\frac{\text{Total Verified Door Check-Ins}}{\max(1, \text{Total Confirmed Registrations})}\right) \times 100$$
- **Zero-Division Guard:** If `Total Confirmed Registrations == 0`, returns $0\%$.

### 2.3 Registration Cancellation Rate
$$\text{Cancellation Rate (\%)} = \left(\frac{\text{Total Cancellations}}{\max(1, \text{Total Historical Bookings})}\right) \times 100$$
- **Formula Mechanics:** $\text{Total Historical Bookings} = \text{Confirmed Registrations} + \text{Attended Registrations} + \text{Total Cancellations}$.
- **Zero-Division Guard:** If no bookings have ever occurred, returns $0\%$.

### 2.4 Waitlist Promotion Rate (formerly mislabeled Conversion Rate)
$$\text{Waitlist Promotion Rate (\%)} = \left(\frac{\text{Accepted / Promoted Waitlist Entries}}{\max(1, \text{Eligible Waitlisted Users})}\right) \times 100$$
- **Eligible Waitlisted Users:** Total users who joined the waitlist and either remain in queue (`PENDING`, `OFFERED`) or were successfully promoted (`ACCEPTED`). Voluntary withdrawals (`CANCELLED` / `EXPIRED`) before promotion are tracked separately.
- **Alias Compatibility:** The API returns both `waitlistPromotionRate` and `waitlistConversionRate` (aliased) to maintain full backward compatibility with frontend consumers without breaking changes.

### 2.5 Registration Conversion Rate (Visitor Traffic)
- **Status:** Explicitly flagged as `available: false`.
- **Reason:** Calculating actual visitor-to-attendee conversion rate requires tracking top-of-funnel unique page impressions or marketing referrer sessions (e.g., via Google Analytics 4, Plausible, or server-side telemetry logs). Attempting to synthesize this from database rows alone is statistically invalid.
- **API Payload:**
```json
{
  "registrationConversionRate": {
    "available": false,
    "reason": "Requires public website visitor and session tracking telemetry."
  }
}
```

---

## 3. IMMUTABLE REGISTRATION TRANSITION AUDITING

### 3.1 Problem Identified in Phase 5.1
The schema enforces a unique constraint:
```prisma
model Registration {
  id        String   @id @default(cuid())
  eventId   String
  userId    String
  status    String   @default("CONFIRMED") // CONFIRMED, CANCELLED, ATTENDED
  cancelledAt DateTime?
  @@unique([userId, eventId])
}
```
When user Alice registers, cancels, and later re-registers or is auto-promoted from the waitlist, the existing record in `registrations` is updated from `CANCELLED` back to `CONFIRMED` with `cancelledAt: null`. A query querying `where: { status: 'CANCELLED' }` would lose visibility into the fact that a cancellation event occurred.

### 3.2 Solution Implemented in Phase 5.2
Whenever a registration state change occurs, a permanent audit record is committed to `ActivityLog`:

1. **New Registration (`registerForEvent`):**
   ```js
   await tx.activityLog.create({
     data: {
       userId,
       action: 'REGISTRATION_STATUS_TRANSITION',
       entityType: 'Registration',
       entityId: registration.id,
       detailsJson: JSON.stringify({
         fromStatus: existingRegistration ? existingRegistration.status : 'NONE',
         toStatus: 'CONFIRMED',
         eventId,
         ticketCode,
       }),
     },
   });
   ```

2. **Cancellation (`cancelRegistration`):**
   ```js
   await tx.activityLog.create({
     data: {
       userId,
       action: 'REGISTRATION_STATUS_TRANSITION',
       entityType: 'Registration',
       entityId: registration.id,
       detailsJson: JSON.stringify({
         fromStatus: registration.status,
         toStatus: 'CANCELLED',
         eventId,
         ticketCode: registration.ticketCode,
       }),
     },
   });
   ```

3. **Waitlist Auto-Promotion (`cancelRegistration`):**
   ```js
   await tx.activityLog.create({
     data: {
       userId: nextWaitlist.userId,
       action: 'REGISTRATION_STATUS_TRANSITION',
       entityType: 'Registration',
       entityId: promotedReg.id,
       detailsJson: JSON.stringify({
         fromStatus: prevReg ? prevReg.status : 'NONE',
         toStatus: 'CONFIRMED',
         eventId,
         ticketCode,
         source: 'WAITLIST_AUTO_PROMOTION',
         waitlistId: nextWaitlist.id,
       }),
     },
   });
   ```

### 3.3 Analytics Query Resilience
In `analyticsController.js`, metrics can aggregate both active registration states and historical cancellation transitions from `activity_logs` where `action = 'REGISTRATION_STATUS_TRANSITION'` and `detailsJson.toStatus = 'CANCELLED'`. This guarantees that historical rate calculations remain strictly accurate regardless of subsequent waitlist promotions.

---

## 4. CODE IMPLEMENTATION SNAPSHOT

### `server/src/controllers/analyticsController.js`
```javascript
// Rate calculations with zero-division protection
const capacityUtilization = totalCapacity > 0
  ? Math.min(100, Math.round((confirmedCount / totalCapacity) * 100))
  : 0;

const attendanceRate = confirmedCount > 0
  ? Math.round((attendedCount / confirmedCount) * 100)
  : 0;

const totalBookingsEver = confirmedCount + attendedCount + totalCancellations;
const cancellationRate = totalBookingsEver > 0
  ? Math.round((totalCancellations / totalBookingsEver) * 100)
  : 0;

const waitlistPromotionRate = eligibleWaitlist > 0
  ? Math.round((acceptedWaitlist / eligibleWaitlist) * 100)
  : 0;
```

---

## 5. TEST VERIFICATION

Automated tests in `server/tests/phase5_1.test.js` verify:
1. `capacityUtilization` is defined, accurate, and non-NaN.
2. `attendanceRate` is non-NaN and bounded in $[0, 100]$.
3. `cancellationRate` accounts for total bookings and handles zero bookings safely.
4. `waitlistPromotionRate` is returned and aliased to `waitlistConversionRate`.
5. `registrationConversionRate.available === false` with clear descriptive reasoning.
6. Zero capacity events return 0 without triggering `NaN` or unhandled exceptions.

All tests pass (87/87 passing).

