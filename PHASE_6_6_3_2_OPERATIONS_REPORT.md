# PHASE 6.6.3.2 — OPERATIONS & MONITORING REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.2  
**Target Infrastructure:** Vercel Global CDN + Railway Container App + Neon Serverless PostgreSQL  
**Status:** **OPERATIONAL BASELINE DEFINED — PENDING CLOUD TELEMETRY**

---

## 1. Provider Telemetry & Observability Matrix

| Component | Provider | Telemetry Features | Operational Capabilities |
|---|---|---|---|
| **Frontend** | Vercel | Real-time Edge Access Logs, Web Vitals, 4xx/5xx error rates | Instant rollback to previous deployment sha; immutable asset caching. |
| **Backend** | Railway | Real-time container stdout/stderr streaming, memory & CPU metrics | Automatic container restarts on failure (`ON_FAILURE`, max 10 retries); dynamic zero-downtime container swaps. |
| **Database** | Neon | Query latency metrics, connection pool usage, storage consumption | Automated serverless compute pausing on idle; point-in-time recovery (PITR). |

---

## 2. Backup & Disaster Recovery Architecture

1. **Neon Serverless Backups:**
   - Neon maintains automated continuous write-ahead log (WAL) archiving.
   - **Point-in-Time Recovery (PITR):** Neon Free Tier supports branching and PITR within a configurable time window; Paid plans support extended recovery retention.
   - *Operational Note:* A production restore drill must be executed on a non-production branch before certifying disaster recovery Recovery Point Objective (RPO) and Recovery Time Objective (RTO) metrics.
2. **Database Migration Rollback Strategy:**
   - In the event of an incompatible DDL release, Prisma migration rollback scripts and point-in-time branch restores provide instant recovery without data corruption.

---

## 3. Health & Uptime Monitoring

- **Application Health Check:** `/health` and `/api/health` probe PostgreSQL via `SELECT 1`.
  - HTTP 200: Application and database operational.
  - HTTP 503: Database unreachable or degraded.
- **External Uptime Monitoring:** External synthetics (e.g. BetterStack, UptimeRobot) should be pointed to `https://[RAILWAY-SERVICE-DOMAIN].up.railway.app/health` with a 60-second polling cadence.
