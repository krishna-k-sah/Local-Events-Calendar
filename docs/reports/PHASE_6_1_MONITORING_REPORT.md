# PHASE 6.1: PRODUCTION MONITORING & ALERTING REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Site Reliability Engineer Lead  
**Date:** November 2026  
**Monitoring Status:** **PASS** (Zero-Cost Probing & Structured Telemetry Configured)  

---

## 1. PRODUCTION MONITORING TOPOLOGY

EventHub utilizes a lightweight, zero-cost observability architecture:
1. **Health Check Probing**: Dual endpoints `/health` and `/api/health` execute live PostgreSQL query tests (`SELECT 1`).
2. **Uptime Alerts**: Integration-ready for UptimeRobot / BetterStack free tier (60-second ping interval).
3. **Container Metrics**: CPU, memory, network I/O, and auto-restart logging supported natively via Railway / Render / Docker metrics.
4. **Structured Logging**: Structured JSON logging in production with complete sanitization of credentials and sensitive customer data.

---

## 2. PRODUCTION ALERTING THRESHOLDS

| Metric Indicator | Threshold Limit | Severity | Notification Action |
|---|---|---|---|
| **Health Probe Failure** | 2 consecutive failed probes | Critical | Automated SMS / PagerDuty alert |
| **p95 Latency** | $> 1000$ ms for 5 minutes | High | Slack #alerts channel notification |
| **5xx Error Rate** | $> 1\%$ of all incoming traffic | Critical | Automated rollback trigger |
| **Auth Failures** | $> 50$ failed logins in 5 min | Medium | Temporary IP throttle |
| **DB Pool Saturation** | Pool utilization $> 90\%$ | High | Connection pool scaling |

**Classification:** **PASS**

