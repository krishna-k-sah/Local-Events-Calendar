# PHASE 5: REST API DOCUMENTATION
## Local Event Calendar Management System

**Version:** 2.0 (Phase 5 Release)  
**Base URL:** `/api`  
**Authentication:** Bearer JWT in `Authorization` header (`Bearer <token>`)

---

## 1. Digital Ticket Pass API

### 1.1 Get Ticket Details & Signed Pass
Retrieves digital ticket pass details, status, attendee profile, and signed cryptographic token.
- **Method:** `GET`
- **Endpoint:** `/api/tickets/:ticketCode`
- **Access:** Authenticated (Ticket Owner, Event Organizer, or ADMIN)
- **Parameters:**
  - `ticketCode` (Path parameter, string): Unique ticket code, e.g., `EVT-TECH-4821`.
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "ticketCode": "EVT-TECH-4821",
    "ticketStatus": "VALID",
    "registrationStatus": "CONFIRMED",
    "signedToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "registeredAt": "2026-11-09T10:00:00.000Z",
    "attendee": {
      "fullName": "Alice Walker",
      "email": "alice@example.com",
      "phone": "+1 (555) 234-5678"
    },
    "event": {
      "id": "evt-1234",
      "title": "AI & Tech Summit 2026",
      "description": "Deep dive into emerging intelligence.",
      "startDate": "2026-11-15T09:00:00.000Z",
      "endDate": "2026-11-15T17:00:00.000Z",
      "venueName": "Moscone Convention Center",
      "address": "747 Howard St",
      "city": "San Francisco",
      "category": "Technology & AI",
      "posterImage": "/uploads/events/ai-summit.jpg",
      "organizer": "Elena Rostova"
    },
    "attendance": null
  }
}
```
- **Error Codes:**
  - `403 Forbidden`: Unauthorized user attempting to access another person's ticket.
  - `404 Not Found`: Ticket code not found.

---

## 2. Attendance & Door Check-in Scanner API

### 2.1 Door Check-in Scan
Validates scannable QR token or raw ticket code, marks admission, and records scanner audit trail.
- **Method:** `POST`
- **Endpoint:** `/api/attendance/scan`
- **Access:** Authenticated (`ORGANIZER` of the event or `ADMIN`)
- **Request Body:**
```json
{
  "ticketCodeOrToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "eventId": "evt-1234",
  "method": "QR",
  "notes": "Fast-track VIP entrance"
}
```
- **Response `200 OK` (Admission Confirmed):**
```json
{
  "success": true,
  "message": "Check-in confirmed for Alice Walker!",
  "data": {
    "attendanceId": "att-5678",
    "ticketCode": "EVT-TECH-4821",
    "attendee": {
      "id": "usr-101",
      "fullName": "Alice Walker",
      "email": "alice@example.com"
    },
    "scannedAt": "2026-11-15T08:52:10.123Z",
    "method": "QR",
    "scannedBy": "Elena Rostova"
  }
}
```
- **Response `409 Conflict` (Duplicate Scan Detection):**
```json
{
  "success": false,
  "duplicate": true,
  "message": "DUPLICATE SCAN: Ticket already used. Checked in at 08:52:10 AM by Elena Rostova.",
  "data": {
    "attendee": { "fullName": "Alice Walker" },
    "scannedAt": "2026-11-15T08:52:10.123Z",
    "scannedBy": "Elena Rostova",
    "ticketCode": "EVT-TECH-4821"
  }
}
```

### 2.2 Get Event Attendance Roster
- **Method:** `GET`
- **Endpoint:** `/api/attendance/events/:id` (or `/api/events/:id/attendance`)
- **Access:** Authenticated (`ORGANIZER` of the event or `ADMIN`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "eventId": "evt-1234",
    "eventTitle": "AI & Tech Summit 2026",
    "totalRegistered": 50,
    "totalAttended": 42,
    "attendanceRate": 84,
    "roster": [
      {
        "registrationId": "reg-1",
        "ticketCode": "EVT-TECH-4821",
        "registrationStatus": "ATTENDED",
        "ticketStatus": "USED",
        "registeredAt": "2026-11-09T10:00:00.000Z",
        "attendee": { "fullName": "Alice Walker", "email": "alice@example.com" },
        "isCheckedIn": true,
        "checkInDetails": {
          "scannedAt": "2026-11-15T08:52:10.123Z",
          "method": "QR",
          "scannedBy": "Elena Rostova"
        }
      }
    ]
  }
}
```

### 2.3 Export Attendance CSV Roster
- **Method:** `GET`
- **Endpoint:** `/api/attendance/events/:id/export` (or `/api/events/:id/attendance/export`)
- **Access:** Authenticated (`ORGANIZER` of the event or `ADMIN`)
- **Response `200 OK`:** Streams attachment `text/csv; charset=utf-8`.

---

## 3. Event Waitlist Management API

### 3.1 Join Event Waitlist
Adds user to the fair queue when the event is at full capacity.
- **Method:** `POST`
- **Endpoint:** `/api/events/:id/waitlist`
- **Access:** Authenticated (`ATTENDEE`, `ORGANIZER`, `ADMIN`)
- **Response `201 Created`:**
```json
{
  "success": true,
  "message": "You have been added to the waitlist at position #1.",
  "data": {
    "waitlistId": "wt-901",
    "position": 1,
    "totalWaitlist": 1,
    "status": "PENDING"
  }
}
```

### 3.2 Leave Waitlist
Cancels waitlist entry and decrements subsequent queue positions automatically.
- **Method:** `DELETE`
- **Endpoint:** `/api/events/:id/waitlist`
- **Access:** Authenticated
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "You have left the waitlist."
}
```

### 3.3 Check Waitlist Status
- **Method:** `GET`
- **Endpoint:** `/api/events/:id/waitlist/status`
- **Access:** Public / Optional Authentication
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "onWaitlist": true,
    "position": 1,
    "status": "PENDING",
    "totalWaitlist": 3
  }
}
```

---

## 4. Personalized Recommendations API

### 4.1 Get Curated Recommendations
Multi-factor recommendation engine combining category affinity, location, and social momentum.
- **Method:** `GET`
- **Endpoint:** `/api/recommendations`
- **Access:** Public / Optional Authentication
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "evt-789",
      "title": "Silicon Valley Cloud Meetup",
      "description": "Networking and keynote sessions for engineers.",
      "startDate": "2026-11-20T18:00:00.000Z",
      "venueName": "CloudSpace",
      "city": "San Francisco",
      "category": "Technology & AI",
      "recommendationScore": 75,
      "recommendationReason": "Because you like Technology & AI"
    }
  ]
}
```

---

## 5. Organizer Analytics & Telemetry API

### 5.1 Get Organizer Analytics
Computes aggregate operational metrics across organized events.
- **Method:** `GET`
- **Endpoint:** `/api/organizer/analytics`
- **Access:** Authenticated (`ORGANIZER` or `ADMIN`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalEvents": 8,
      "totalCapacity": 650,
      "totalRegistered": 540,
      "totalAttended": 472,
      "totalWaitlisted": 35,
      "capacityUtilization": 83,
      "attendanceRate": 87
    },
    "eventPerformance": [
      {
        "id": "evt-1234",
        "title": "AI & Tech Summit 2026",
        "capacityUtilization": 100,
        "attendanceRate": 84,
        "waitlistCount": 8
      }
    ],
    "registrationTrends": [
      { "date": "2026-11-01", "count": 12 },
      { "date": "2026-11-02", "count": 19 }
    ],
    "categoryDistribution": [
      { "name": "Technology & AI", "events": 4, "attendees": 310 }
    ]
  }
}
```

---

## 6. Automated Event Reminders API

### 6.1 Trigger Automated Reminders
Evaluates upcoming events and dispatches 24-hour and 2-hour notifications.
- **Method:** `POST`
- **Endpoint:** `/api/reminders/trigger`
- **Access:** Authenticated (`ADMIN` or `ORGANIZER`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Automated event reminder processing complete.",
  "data": {
    "evaluatedEvents": 4,
    "reminders24hSent": 12,
    "reminders2hSent": 3,
    "errors": []
  }
}
```

