# EventHub – Local Event Calendar Management System
### Modern SaaS Full-Stack Web Application (Phase 5 Production Release)

EventHub is a modern, enterprise-ready Local Event Calendar Management System engineered with **React, Vite, Tailwind CSS, Node.js, Express, Prisma ORM, and PostgreSQL / SQLite**.

---

## 🌟 Key Features Across Phases 1 through 5

### 1. Intelligent Event Ticketing & Digital Passes (Phase 5)
- **Cryptographic QR Event Passes**: Fast, secure door admission using HMAC SHA-256 signed JWT tokens embedded in scannable vector QR codes.
- **Vector PDF Ticket Export**: One-click download of airline-grade A5 printable digital badges powered by `jspdf`.
- **Status Lifecycle**: Real-time status indicators (`VALID`, `USED`, `CANCELLED`, `EXPIRED`).

### 2. Door Attendance Scanner & Anti-Fraud Engine (Phase 5)
- **Door Check-in Scanner**: Integrated camera and laser barcode scanner modal for organizers and admission staff.
- **Zero Duplicate Check-ins**: Immediate `409 Conflict` response with high-visibility audit alerts if a pass is presented more than once.
- **Roster & CSV Export**: Real-time door check-in counters and one-click attendance ledger CSV downloads.

### 3. Fair-Queue Waitlist & Zero-Intervention Auto-Promotion (Phase 5)
- **Automated Waitlisting**: When an event sells out, attendees join an ordered queue.
- **Transactional Seat Promotion**: If an attendee cancels, the database transaction immediately allocates the vacated seat to the top waitlisted attendee, generates a new confirmed ticket, and dispatches an urgent in-app notification.

### 4. Automated Event Reminders & Notification Engine (Phase 5)
- **Background Scheduler**: Evaluates upcoming published events and sends alerts at 24 hours and 2 hours prior to start time.
- **Strict Idempotency**: Database constraints guarantee no attendee ever receives duplicate reminders.

### 5. Multi-Factor Personalized Recommendations (Phase 5)
- **Smart Scoring**: Combines user category affinity (+40), geographic proximity (+25), event popularity (+20), and upcoming timing (+15).
- **Explainable Rationale**: Displays badges explaining recommendations (*"Because you like Tech & AI"*, *"Popular near you in San Francisco"*).

### 6. Role-Based Governance (Admin, Organizer, Attendee)
- **Administrator**: Comprehensive governance, user role modification, event approval/rejection workflows, taxonomy and category management, and CSV data reports.
- **Organizer**: Event creation wizard with location autocompletion, multi-format media uploads, ticket capacity management, door scanner, and attendee telemetry.
- **Attendee**: Public landing page, faceted search discovery, interactive FullCalendar community view, one-click RSVP, favorites bookmarks, and profile management.

---

## 🏗️ Technology Stack

| Domain | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite 5, Tailwind CSS |
| **Calendar Engine** | FullCalendar (DayGrid, TimeGrid, Interaction) |
| **Data Visualizations** | Recharts (Responsive Analytics & Telemetry) |
| **Ticketing & PDFs** | QRCode, jsPDF |
| **Backend Runtime** | Node.js (ES Modules), Express.js |
| **ORM & Database** | Prisma ORM, SQLite (Dev/Test), PostgreSQL (Production) |
| **Security & Auth** | JSON Web Tokens (JWT), bcryptjs, Helmet, CORS, Rate Limit |
| **Validation & Uploads**| Zod, Multer with Magic-Byte File Inspection |
| **Test Frameworks** | Vitest, Supertest, Playwright (Headless Chromium) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation
```bash
# Clone the repository
git clone <repo-url>
cd "Local Event Calendar"

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
cd ..
```

### 3. Database Initialization & Seeding
```bash
# Push database schema and generate Prisma client
cd server
$env:DATABASE_URL="file:./dev.db" # Windows PowerShell
npx prisma db push

# Seed demo users, categories, locations, and events
node prisma/seed.js
cd ..
```

### 4. Running the Application Locally
In two separate terminals:

**Terminal 1 (Backend Server on Port 5000):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend Client on Port 5173):**
```bash
cd client
npm run dev
```

Open your browser to `http://localhost:5173`.

---

## 👥 Demo User Credentials

| Role | Email | Password | Access Highlights |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@eventhub.com` | `password123` | Governance, Approvals, Categories, Audit Reports |
| **Event Organizer** | `elena@novatech.io` | `password123` | Event Creation Wizard, Door Scanner, Analytics |
| **Community Attendee** | `sarah.j@gmail.com` | `password123` | Public Discovery, RSVP, QR Passes, Favorites |

---

## 🧪 Automated Test Execution

### Run Full Backend Test Suite (74 Vitest + Supertest Tests)
```bash
cd server
npm test
```

### Run Playwright Browser E2E Suite (5 Real Chromium Tests)
```bash
npx playwright test
```

---

## 📦 Production Build & Deployment

```bash
# Build optimized client
cd client
npm run build
```
- Initial shell size: **~33 kB raw (9.2 kB gzipped)**.
- Route-based lazy loading automatically isolates FullCalendar, Recharts, and jsPDF into independent asynchronously loaded chunks.

