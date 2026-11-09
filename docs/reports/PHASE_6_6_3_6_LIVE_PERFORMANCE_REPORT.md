# EventHub Phase 6.6.3.6 – Live Performance & Latency Audit Report

**Project:** EventHub – Local Event Calendar Management System  
**Phase:** Phase 6.6.3.5  
**Subject:** Live Performance, Endpoint Latencies, Database Ping & Edge Bundle Breakdown  
**Execution Timestamp:** 2026-11-09T22:49:00+05:30  
**Overall Status:** LOCAL BENCHMARKS VERIFIED (GRADE A) — CLOUD PERFORMANCE NOT TESTED (PENDING DEPLOYMENT)  

---

## 1. Executive Summary

This report presents performance and latency metrics for EventHub. Local benchmarks were measured using Node.js high-resolution timers (`performance.now()`), Supertest, and Vite build telemetry.

Because the live services have not been provisioned in the cloud, cloud latency benchmarks (e.g. edge CDN roundtrip, cross-region TLS handshakes, serverless cold starts) are classified as **NOT TESTED (PENDING DEPLOYMENT)**.

---

## 2. Empirical Benchmark Matrix

| Operation / Endpoint | Local Measured Metric | Target Threshold | Local Status | Live Cloud Status |
|---|---|---|---|---|
| **Liveness Probe (`/health`)** | **11.16 ms** avg (min: 3.46 ms, max: 74.82 ms) | < 100 ms | **VERIFIED** | **NOT TESTED** |
| **Public Events Listing (`/api/events`)** | **9.08 ms** avg (min: 6.61 ms, max: 23.50 ms) | < 150 ms | **VERIFIED** | **NOT TESTED** |
| **Organizer Telemetry (`/api/organizer/analytics`)**| **6.55 ms** avg (min: 5.59 ms, max: 10.33 ms) | < 250 ms | **VERIFIED** | **NOT TESTED** |
| **Raw Database Ping (`SELECT 1`)** | **0.69 ms** avg | < 5 ms | **VERIFIED** | **NOT TESTED** |
| **Complex Relational Query (`findMany` 20 w/ 3 joins)**| **4.55 ms** avg | < 30 ms | **VERIFIED** | **NOT TESTED** |
| **Frontend Production Build Time** | **10.95 s** (2,755 modules) | < 30 s | **VERIFIED** | **NOT APPLICABLE** |
| **Frontend Chunk Distribution** | **44 chunks** (largest vendor: 424 kB raw / 114 kB gzip)| < 500 kB gzip | **VERIFIED** | **NOT APPLICABLE** |
| **Docker Multi-Port Startup Time**| **~2.07 s** on both Port 5000 and Port 8080 | < 10 s | **VERIFIED** | **NOT TESTED** |

---

## 3. Cloud Performance Measurement Protocol (Post-Deployment)

Once live cloud endpoints are deployed, the following benchmarking protocol will be executed:
- **Location:** Client test runner.
- **Request Volume:** 20 consecutive HTTP GET requests to each deployed endpoint.
- **Metrics Collected:** Min, Max, Median, and p95 latency.
- **Tool:** PowerShell `Measure-Command` and curl timing flags (`time_namelookup`, `time_connect`, `time_appconnect`, `time_starttransfer`, `time_total`).

---

## 4. Audit Conclusion

The application demonstrates high local throughput and sub-15ms response times. Live cloud latency status: **NOT TESTED (PENDING CLOUD DEPLOYMENT)**.

