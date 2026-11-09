# PHASE 6.6.3.3 — OPERATIONS, MONITORING & DISASTER RECOVERY REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.3  
**Target Infrastructure:** Vercel (Edge CDN) + Railway (Container) + Neon (Serverless PostgreSQL)  
**Status:** **OPERATIONAL PROCEDURES PRIMED — PENDING CLOUD TELEMETRY**

---

## 1. Cloud Infrastructure Observability Architecture

```
[Vercel Global CDN]  ---> Access Logs, Edge Latency, Core Web Vitals
        |
        v HTTPS
[Railway App Engine] ---> Container stdout/stderr, RAM & CPU Telemetry, Restart Counters
        |
        v TLS 1.3
[Neon PostgreSQL 16] ---> Active Connections, Query Durations, Compute Autoscaling, WAL Archive
```

---

## 2. Telemetry & Log Monitoring Specifications

1. **Railway Container Telemetry:**
   - **Log Streaming:** Accessible via `npx @railway/cli logs` or Railway Web Dashboard.
   - **Restart Policy:** Configured in [`server/railway.json`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/server/railway.json) as `ON_FAILURE` (max 10 retries).
   - **Healthcheck Path:** `/health` probed at 30-second intervals with 100-second timeout.
2. **Vercel Edge Telemetry:**
   - Real-time HTTP status logs and invocation times.
   - 4xx and 5xx alerts configured in Vercel dashboard.

---

## 3. Disaster Recovery & Backup Architecture

1. **Neon Serverless Database Recovery:**
   - Continuous Write-Ahead Log (WAL) archiving.
   - Point-in-Time Recovery (PITR) capable within Neon's retention window.
   - Database branches can be generated instantly for staging test restores without affecting production traffic.
2. **Rollback Strategy:**
   - **Frontend:** Instant one-click rollback in Vercel dashboard to previous deployment hash.
   - **Backend:** Instant rollback to previous Docker image deployment in Railway.
   - **Database:** Prisma migration rollbacks using dedicated down-migration scripts or Neon branch restore.

*Note: Disaster recovery RTO and RPO metrics will be officially measured following the execution of an authorized restore drill on a non-production branch.*
