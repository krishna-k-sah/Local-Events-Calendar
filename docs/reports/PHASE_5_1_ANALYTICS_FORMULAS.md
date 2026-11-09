# PHASE 5.1: ORGANIZER ANALYTICS FORMULA SPECIFICATION
## Local Event Calendar Management System (EventHub)

---

## 1. Overview & Source of Truth

To avoid discrepancies between the backend API and frontend display components, **backend aggregation is the sole source of truth**. The frontend renders received metrics without applying independent recalculations or partial dataset approximations.

---

## 2. Standardized Metric Formulas

### 2.1 Capacity Utilization (%)
Measures the proportion of available event capacity reserved by confirmed attendees.

$$\text{Capacity Utilization (\%)} = \begin{cases} \left(\frac{\text{Confirmed Registrations}}{\text{Maximum Capacity}}\right) \times 100 & \text{if } \text{Maximum Capacity} > 0 \\ 0 & \text{if } \text{Maximum Capacity} \le 0 \end{cases}$$

- **Confirmed Registrations:** Total active registrations with status `CONFIRMED` or `ATTENDED`. Cancelled reservations are excluded.
- **Maximum Capacity:** The authorized seat cap set by the organizer.

---

### 2.2 Attendance Rate (%)
Measures the percentage of booked attendees who physically checked in at the event door.

$$\text{Attendance Rate (\%)} = \begin{cases} \left(\frac{\text{Unique Valid Check-ins}}{\text{Confirmed Registrations}}\right) \times 100 & \text{if } \text{Confirmed Registrations} > 0 \\ 0 & \text{if } \text{Confirmed Registrations} = 0 \end{cases}$$

- **Unique Valid Check-ins:** Total distinct tickets scanned and marked `ATTENDED` (backed by single-admission records in the `Attendance` table). Duplicate scans do not increment this count.
- **Confirmed Registrations:** Total eligible attendee reservations.

---

### 2.3 Cancellation Rate (%)
Quantifies the rate of churn before the event takes place.

$$\text{Cancellation Rate (\%)} = \begin{cases} \left(\frac{\text{Cancelled Registrations}}{\text{Total Created Registrations}}\right) \times 100 & \text{if } \text{Total Created Registrations} > 0 \\ 0 & \text{if } \text{Total Created Registrations} = 0 \end{cases}$$

- **Cancelled Registrations:** Total reservations with status `CANCELLED`.
- **Total Created Registrations:** Confirmed + Attended + Cancelled for the reporting cohort.

---

### 2.4 Waitlist Conversion Rate (%)
Evaluates the efficiency of the automated waitlist queue in filling vacated seats.

$$\text{Waitlist Conversion (\%)} = \begin{cases} \left(\frac{\text{Successfully Promoted Users}}{\text{Users Offered a Seat}}\right) \times 100 & \text{if } \text{Users Offered a Seat} > 0 \\ 0 & \text{if } \text{Users Offered a Seat} = 0 \end{cases}$$

- **Successfully Promoted Users:** Waitlist records that transitioned to `ACCEPTED`.
- **Users Offered a Seat:** Waitlist entries with status `ACCEPTED` or `OFFERED`.

---

### 2.5 Registration Conversion Rate
Measures the conversion of unique event landing page visitors into registered ticket holders:

$$\text{Registration Conversion (\%)} = \left(\frac{\text{Confirmed Registrations}}{\text{Unique Event Page Visitors}}\right) \times 100$$

- **Status:** **UNAVAILABLE**
- **Contract:** The system explicitly returns:
  ```json
  {
    "available": false,
    "value": null,
    "reason": "Requires page-level unique visitor tracking telemetry."
  }
  ```
  The platform does not display fabricated conversion ratios without underlying page-visit telemetry.

---

### 2.6 Event Fill Rate vs. Capacity Utilization
- In this application, **Event Fill Rate** is defined identically to **Capacity Utilization** at the single-event scope:
  $$\text{Event Fill Rate} = \text{Capacity Utilization} = \left(\frac{\text{Confirmed Registrations}}{\text{Maximum Capacity}}\right) \times 100$$

---

## 3. Mathematical Safety & Edge-Case Rules

1. **Zero-Division Invariant:** All denominators ($D$) are evaluated prior to division. If $D \le 0$, the metric strictly yields `0`.
2. **NaN & Infinity Prohibition:** Returned values are always finite integer numbers ($[0, 100]$) or structured objects. `NaN`, `Infinity`, `-Infinity`, or `null` numbers are never emitted.
3. **Cohort Consistency:** Numerator and denominator are drawn from the exact same event ID and timeframe scope.

