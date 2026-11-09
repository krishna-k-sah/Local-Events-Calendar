# PHASE 6: PRODUCTION OBSERVABILITY & MONITORING REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Principal Observability Architect & SRE Lead  
**Date:** November 2026  
**Observability Status:** **PASS** (Low-Overhead Production Telemetry Configured)  

---

## 1. OBSERVABILITY ARCHITECTURE & TELEMETRY DOMAINS

To guarantee zero dependency bloat while delivering enterprise-grade visibility, EventHub employs a 4-pillar observability framework:

```
+---------------------------------------------------------------------------------+
|                        EVENTHUB OBSERVABILITY FRAMEWORK                         |
+---------------------------------------------------------------------------------+
| 1. Synthetic Probing    | GET /health (Uptime Robot, BetterUptime, Pingdom)     |
| 2. Structured Logging   | Non-leaking JSON access & error logs to stdout        |
| 3. Database Metrics     | Prisma connection pool & query latency telemetry     |
| 4. Business Telemetry   | ActivityLog audit stream (Registrations, Scans)       |
+---------------------------------------------------------------------------------+
```

---

## 2. PRODUCTION MONITORING METRICS SPECIFICATION

| Monitoring Domain | Telemetry Indicator | Target Threshold | Alerting Trigger | Response Protocol |
|---|---|---|---|---|
| **API Availability** | `/health` probe (HTTP 200) | $\ge 99.95\%$ Uptime | 2 consecutive failed probes (HTTP 503) | PagerDuty / Slack alert; container restart |
| **API Latency (p95)** | Request round-trip time | $\le 250$ ms | $p95 > 1000$ ms over 5 minutes | Inspect slow query logs, autoscale replicas |
| **5xx Error Rate** | Server exceptions | $\le 0.1\%$ of total traffic | $> 1\%$ 5xx errors over 3 minutes | Trigger rollback; inspect structured error logs |
| **4xx Error Rate** | Client/Auth rejections | $\le 5\%$ of total traffic | Sudden $10\times$ surge | Investigate potential credential stuffing |
| **DB Connection Pool** | Active vs idle connections | $\le 80\%$ pool capacity | Pool utilization $> 90\%$ for 2 min | Increase `connection_limit` or scale PgBouncer |
| **Background Scheduler**| `event_reminders` delivery | $100\%$ delivery of due reminders | Reminder retry count reaches 3 | Poison pill triage; verify email/notification gateway |
| **Check-in Telemetry** | Door scanner 409 conflicts | Monitored | $> 5$ duplicates on single event in 5 min | Flag suspicious badge copying or badge sharing |

---

## 3. STRUCTURED LOGGING & DATA SANITIZATION

### 3.1 PII and Secret Redaction Policy
In production mode, the following fields are masked or omitted from logs:
- `password`, `passwordHash` (strictly excluded)
- `Authorization` header bearer tokens (masked as `Bearer [REDACTED]`)
- Credit card / financial details (none stored)
- User emails (truncated or hashed in debug traces)

### 3.2 Structured JSON Log Format Example
```json
{
  "timestamp": "2026-11-09T08:45:10.123Z",
  "level": "INFO",
  "environment": "production",
  "method": "POST",
  "path": "/api/attendance/scan",
  "statusCode": 200,
  "responseTimeMs": 14.2,
  "userId": "cmw8z...",
  "eventId": "cmw8a...",
  "action": "ATTENDANCE_CHECKIN"
}
```

---

## 4. ZERO-COST ALERTING RUNBOOK

1. **Uptime Monitoring**: Configure a free check on **UptimeRobot** or **Better Stack** pointing to `https://api.eventhub.app/health` at 60-second intervals.
2. **Container Telemetry**: Native CPU, memory, and restart graphs provided automatically in Railway / Render dashboard.
3. **Database Health**: Real-time connection count and query latency dashboards enabled in Neon / Supabase consoles.

**Classification:** **PASS**

