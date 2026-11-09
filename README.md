<div align="center">

# 🎟️ EventHub — Local Event Calendar Management System

**An enterprise-grade, high-concurrency event discovery, ticketing, and calendar platform.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22.0-2D3748.svg)](https://www.prisma.io/)
[![Tests Passing](https://img.shields.io/badge/Tests-134%2F134%20Passing-brightgreen.svg)](tests)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC.svg)](https://tailwindcss.com/)

[Key Features](#-key-features) • [Architecture](#-architecture) • [Tech Stack](#-technology-stack) • [Quick Start](#-quick-start) • [Database](#-database--migrations) • [Testing](#-testing-suite) • [Deployment](#-cloud-deployment-guide) • [Security](#-security--owasp-compliance)

---

</div>

## 📖 Overview

**EventHub** is a production-ready, full-stack event calendar and ticketing platform designed for local communities, venues, conference organizers, and attendees. 

Built with **React 18, Vite, Tailwind CSS, Node.js (Express), and Prisma ORM on PostgreSQL 16**, EventHub provides an end-to-end event management lifecycle—from event creation and administrative moderation to cryptographic QR ticketing, real-time door scanning, and automated waitlist seat reallocation.

---

## ✨ Key Features

### 🎟️ 1. Cryptographic QR Ticketing & Digital Passes
- **High-Entropy Token Generator:** Generates 96-bit CSPRNG unique ticket codes formatted as `EVT-XXXXXX-XXXXXX-XXXXXX-XXXXXX` (24 hexadecimal characters) with deterministic database collision prevention.
- **Signed Digital Passes:** Digitally signs QR tokens using HMAC-SHA256 JWTs verifying ticket authenticity and event binding.
- **Vector PDF Badges:** One-click generation and download of printable event badges powered by `jsPDF` and `html2canvas`.
- **Strict Ticket State Engine:** Automatically tracks and enforces ticket lifecycle states: `VALID`, `USED`, `CANCELLED`, and `EXPIRED`.

### 🚪 2. Door Attendance Scanner & Anti-Fraud Engine
- **Built-In Camera & Scanner Modal:** Mobile-friendly attendance check-in tool for organizers and venue staff.
- **Instant Duplicate Prevention:** Hardware-speed duplicate scan rejection returning `409 Conflict` with timestamped prior check-in details.
- **Cancelled Pass Invalidation:** Prevents check-in on cancelled or refunded registrations.
- **Live Roster & CSV Export:** Real-time check-in telemetry and one-click attendance ledger CSV streaming.

### ⏳ 3. Fair-Queue Waitlist & Auto-Promotion Engine
- **Atomic Waitlist Queuing:** When events reach maximum capacity, attendees join an ordered, collision-free waitlist queue (`[1..N]`).
- **Transactional Seat Reallocation:** If a registered attendee cancels, database transactions instantly promote the top-ranked waitlisted attendee, generate a confirmed ticket pass, and dispatch an urgent notification.
- **Race Condition Immunity:** Tested under high-concurrency race conditions (10 simultaneous requests for 1 seat) with zero seat overselling.

### ⏰ 4. Automated Event Reminders & Notification System
- **Background Scheduler:** Evaluates upcoming published events and schedules automated reminders at 24 hours and 2 hours prior to start time.
- **Strict Idempotency:** PostgreSQL constraints and state transitions ensure no attendee ever receives duplicate alerts.
- **Poison Pill Defense:** Automatic lease recovery and 3-attempt circuit breaker limits on failed deliveries.

### 🧠 5. Multi-Factor Personalization & Recommendation Engine
- **Explainable Smart Scoring:** Evaluates category affinities (+40), geographic location (+25), event popularity (+20), and upcoming timing (+15).
- **Clear User Rationale:** Transparent badge explanations (*"Because you enjoy Technology & AI"*, *"Popular in your city"*).

### 👥 6. Full Role-Based Access Control Across All 20 Views
- **🛡️ Administrator (6 Views):** System telemetry, user role governance, event moderation & approvals, category taxonomies, and audit ledgers.
- **🎪 Organizer (5 Views):** Event creation wizard, rich media editor, attendee management, ticket capacity controls, and door scanner.
- **🎟️ Attendee & Public (9 Views):** Landing page, faceted multi-filter discovery, interactive community calendar feed, one-click RSVP, digital pass wallet, bookmarks ledger, and profile settings.

---

## 🏗️ Architecture

```
  +--------------------------------------------------------------------------+
  |                             CLIENT BROWSERS                              |
  +--------------------------------------------------------------------------+
                                       |
                                       v
                [ Vercel Edge Network (Global CDN / TLS 1.3) ]
                Frontend: React 18 SPA + Vite (44 Code-Split Chunks)
                Config: client/vercel.json (SPA Rewrite to /index.html)
                                       |
                         API Requests (/api/*) via HTTPS
                                       v
               [ Railway Container Platform (Docker Alpine Node 20) ]
               Backend: Express.js REST API + Prisma 5.22.0
               Security: Helmet, Rate-Limit, HMAC-SHA256, Bcrypt (10 rounds)
               Dynamic Port Binding: ${PORT:-5000} (Non-Root User: appuser)
                                       |
             Connection Pooled (6543) / Direct DDL Compute (5432) TLS
                                       v
                  [ Neon Serverless PostgreSQL 16 Cluster ]
                  Multi-AZ Replication, ACID Transactions, Row Locking
```

---

## 💻 Technology Stack

| Domain | Technology / Library | Version | Description |
|---|---|---|---|
| **Frontend SPA** | React, React DOM | `18.3.1` | Component-driven declarative UI |
| **Build Tooling** | Vite | `5.4.21` | Sub-second HMR & optimized chunking |
| **Styling & Icons** | Tailwind CSS, Lucide React | `3.4.17` | Utility-first responsive design |
| **Calendar Engine** | FullCalendar | `6.1.15` | Interactive Month, Week & Day calendar feeds |
| **Data Visualizations** | Recharts | `2.15.0` | Responsive telemetry charts & trends |
| **Ticketing & PDFs** | QRCode, jsPDF, html2canvas | Latest | Vector QR passes & downloadable badges |
| **Backend Runtime** | Node.js (ES Modules), Express | `20.x`, `4.21.2` | High-throughput asynchronous REST API |
| **ORM & Database** | Prisma ORM, PostgreSQL | `5.22.0`, `16` | Type-safe schema migrations & relational queries |
| **Security & Auth** | JSON Web Tokens, bcryptjs, Helmet | Latest | JWT session auth, password hashing, CSP headers |
| **Testing Suite** | Vitest, Supertest, Playwright | `5.1.0`, `1.65.0` | 134 automated unit, integration & E2E tests |

---

## 📁 Repository Structure

```
.
├── client/                     # Frontend React + Vite SPA
│   ├── src/
│   │   ├── components/         # Reusable UI components (Modal, Navbar, StatCard)
│   │   ├── context/            # AuthContext, NotificationContext
│   │   ├── pages/              # All 20 application page views
│   │   ├── services/           # Axios API services with URL normalizer
│   │   └── utils/              # Client helpers (date formatters, validators)
│   ├── vercel.json             # Vercel SPA routing & cache control
│   └── vite.config.js          # Vite configuration with vendor code-splitting
├── server/                     # Backend Node.js / Express REST API
│   ├── prisma/
│   │   ├── migrations/         # PostgreSQL migration history
│   │   ├── schema.postgresql.prisma # PostgreSQL production schema (14 tables)
│   │   ├── schema.prisma       # SQLite development schema
│   │   └── seed.js             # Comprehensive database seed fixtures
│   ├── src/
│   │   ├── config/             # DB client, JWT config, environment validator
│   │   ├── controllers/        # Business logic controllers
│   │   ├── middleware/         # Auth, RBAC, Rate-Limit, Error handlers
│   │   ├── routes/             # Express API sub-routers
│   │   ├── services/           # Background scheduler & analytics engines
│   │   └── utils/              # 96-bit CSPRNG ticket generator
│   ├── tests/                  # 10 Vitest backend & concurrency test suites
│   ├── Dockerfile              # Multi-stage production container (Alpine Node 20)
│   └── docker-healthcheck.sh   # Dynamic port container liveness check
├── scripts/                    # Verified operational automation scripts
│   ├── test_disposable_migration.mjs # 9-step disposable migration validator
│   ├── verify_backup_restore.mjs     # Deep archive backup/restore validator
│   └── verify_docker_ports.mjs       # Multi-port container health tester
├── tests/e2e/                  # Playwright browser end-to-end suites
├── package.json                # Root orchestration workspace
├── LICENSE                     # MIT License
└── README.md                   # Project documentation
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js:** `v18.x` or `v20.x` LTS ([Download](https://nodejs.org/))
- **Docker Desktop:** (Optional, for running local PostgreSQL container)
- **Git:** Installed on your local machine

### 1. Clone the Repository
```bash
git clone https://github.com/krishna-k-sah/Local-Events-Calendar-.git
cd Local-Events-Calendar-
```

### 2. Backend Setup
```bash
cd server
npm install

# Configure environment variables
cp .env.example .env
```

Ensure your `server/.env` contains:
```ini
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/eventhub?schema=public"
DIRECT_URL="postgresql://postgres:postgrespassword@localhost:5432/eventhub?schema=public"
JWT_SECRET="your-super-secure-jwt-secret-min-32-chars-long"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
```

Apply migrations and seed initial data:
```bash
# Deploy PostgreSQL schema
npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma

# Seed initial categories, users, and events
npm run prisma:seed
```

Start the backend server:
```bash
npm run dev
# Backend running on http://localhost:5000
```

### 3. Frontend Setup
In a new terminal window:
```bash
cd client
npm install

# Start the Vite development server
npm run dev
# Frontend running on http://localhost:5173
```

### 4. Default Seed Accounts
| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@eventhub.com` | `password123` | Full system governance, approvals, user management |
| **Organizer** | `elena@novatech.io` | `password123` | Event creation, editing, attendees roster, door scanner |
| **Attendee** | `marcus@cityrunners.org`| `password123` | RSVP, waitlist, QR digital passes, bookmarks |

---

## 🗄️ Database & Migrations

EventHub utilizes **Prisma ORM** with native PostgreSQL 16 connection pooling.

### Connection Architecture
- **`DATABASE_URL`:** Pooled connection string (Port 6543 / pgBouncer) for application queries.
- **`DIRECT_URL`:** Direct compute connection (Port 5432) for schema DDL operations.

### Verified Migration Commands
```bash
# Check status of applied migrations
npx prisma migrate status --schema=prisma/schema.postgresql.prisma

# Deploy migrations to target database
npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma

# Re-generate Prisma Client
npx prisma generate --schema=prisma/schema.postgresql.prisma
```

---

## 🧪 Testing Suite

EventHub includes **134 dynamic automated test cases** across backend integration, PostgreSQL race condition stress testing, and Playwright Chromium browser workflows.

```bash
# 1. Run all 129 Vitest backend & concurrency tests
npm run test:server

# 2. Run Playwright E2E browser tests (All 20 views)
npx playwright test --project=chromium

# 3. Build frontend production assets (Vite)
npm run build
```

### Test Suite Breakdown
| Suite Name | Tests | Duration | Description |
|---|---|---|---|
| `phase6_6_3_5_ticket_security.test.js` | 8 | ~2.2s | 96-bit CSPRNG, 500-batch uniqueness, collision retry |
| `phase5_5_postgresql_concurrency.test.js`| 8 | ~3.2s | Flash registration, waitlist ordering, transaction rollbacks |
| `staging_smoke.test.js` | 12 | ~1.0s | Health probes, JWT auth, event lifecycle, QR passes |
| `e2e-workflow.test.js` | 20 | ~1.3s | Persona workflows covering all 20 views |
| `phase5.test.js` | 17 | ~2.0s | QR ticketing, door scanner, CSV stream export |
| `phase5_3_analytics.test.js` | 6 | ~1.8s | Zero-division safety, capacity, attendance & promotion math |
| `api.test.js` | 37 | ~2.1s | REST endpoint contracts, validation & auth guards |
| `load_stress.test.js` | 3 | ~2.5s | High-concurrency race condition simulations |
| `phase5_3_reminders.test.js` | 5 | ~0.2s | Automated 24h reminder scheduler & idempotency |
| `phase5_1.test.js` | 13 | ~1.0s | Personalization algorithms & notification badges |
| **Playwright Chromium E2E** | **5** | **~20.1s** | Live browser navigation, forms, and camera door scanner |
| **TOTAL** | **134** | **~26.0s** | **100% Pass Rate** |

---

## ☁️ Cloud Deployment Guide

EventHub is optimized for direct cloud deployment without intermediate CI/CD locks:

### 1. Database (Neon Serverless PostgreSQL 16)
1. Create a project named `eventhub-production` on [Neon Console](https://console.neon.tech).
2. Copy the **Pooled Connection URL** (port `6543`) and **Direct Connection URL** (port `5432`).
3. Deploy migrations from your local terminal:
   ```bash
   cd server
   export DATABASE_URL="<NEON_DIRECT_URL>"
   npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma
   ```

### 2. Backend (Railway Container)
```bash
cd server
railway login
railway init -n eventhub-backend
railway variables set NODE_ENV=production DATABASE_URL="<NEON_POOLED_URL>" DIRECT_URL="<NEON_DIRECT_URL>" JWT_SECRET="<SECURE_64_CHAR_SECRET>"
railway up
railway domain
# Verify: curl https://<RAILWAY_DOMAIN>/health returns HTTP 200
```

### 3. Frontend (Vercel Edge Network)
```bash
cd client
vercel login
vercel env add VITE_API_URL production  # Enter: https://<RAILWAY_DOMAIN>
vercel --prod
```

### 4. Link CORS
```bash
cd server
railway variables set CLIENT_URL="https://<VERCEL_DOMAIN>.vercel.app"
railway redeploy
```

---

## 🔒 Security & OWASP Compliance

- **Authentication:** Salted password hashing with `bcryptjs` (10 rounds); HMAC-SHA256 JWT tokens.
- **Secret Protection:** Automatic SHA-256 fingerprint checking on `JWT_SECRET` at startup; immediately halts execution if default/compromised keys are supplied.
- **SQL Injection Defense:** All queries parameterized natively via Prisma ORM.
- **Cross-Site Scripting (XSS):** Automated React JSX escaping and `DOMPurify` HTML sanitization.
- **Rate Limiting:** IP-based throttles on sensitive authentication routes (`/api/auth/login`, `/register`).
- **HTTP Hardening:** Helmet middleware enforcing strict Content Security Policy (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and HSTS.
- **Least-Privilege Docker:** Dockerfile enforces unprivileged non-root execution (`USER appuser`).

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Crafted with passion for community events and modern web engineering.</sub>
</div>
