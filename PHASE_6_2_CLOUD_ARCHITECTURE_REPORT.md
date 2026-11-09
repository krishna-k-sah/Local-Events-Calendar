# PHASE 6.2: CLOUD ARCHITECTURE EVALUATION REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Principal Cloud Solutions Architect  
**Date:** November 2026  
**Architecture Recommendation:** **Vercel (Frontend) + Railway (Backend) + Neon Serverless (PostgreSQL 16)**  

---

## 1. COMPREHENSIVE PROVIDER COMPARISON MATRIX

### 1.1 Frontend Hosting Comparison

| Provider | Monthly Cost | Free-Tier Bandwidth / Limits | Cold Starts | SPA Fallback (`/* -> index.html`) | SSL / TLS Provisioning | Deployment Reliability |
|---|---|---|---|---|---|---|
| **Vercel** | **$0.00** (Hobby) | 100 GB/mo, 100 deployments/day | **Zero** (Static Edge) | Native (`vercel.json`) | Automated Let's Encrypt | 99.99% Global Edge |
| **Cloudflare Pages** | **$0.00** (Free) | **Unlimited Bandwidth**, 500 builds/mo | **Zero** (Static Anycast) | Supported (`_redirects`) | Automated Cloudflare SSL | 99.99% Global Edge |
| **Netlify** | **$0.00** (Free) | 100 GB/mo, 300 build mins/mo | **Zero** (Static Edge) | Supported (`_redirects`) | Automated Let's Encrypt | 99.95% Global Edge |

### 1.2 Backend Hosting Comparison

| Provider | Entry Monthly Cost | Free-Tier Compute Limits | Cold-Start Latency | Container Runtime | Environment Secrets Vault | Restart & Self-Healing |
|---|---|---|---|---|---|---|
| **Railway** | **~$5.00** / mo ($5 trial) | Usage-based execution (~$5/mo) | **Zero Cold Starts** | Dockerfile / Node.js 20+ | Native Web UI & CLI | Automatic restart on failure |
| **Render** | **$0.00** (Free) / **$7** (Starter)| 750 free hrs/mo (spins down after 15m) | **50s delay on Free Tier** | Dockerfile / Web service | Native Web UI | Native restart policy |
| **Fly.io** | **~$3–$5** / mo | Up to 3 shared-cpu VMs | Very fast (<2s) | Firecracker Micro-VM | Fly CLI Secrets | Automatic health restarts |

### 1.3 PostgreSQL Database Hosting Comparison

| Provider | Monthly Cost | Storage Allowance | Connection Pooler | Relational Engine & Locks | Automated Backups | Disaster Recovery |
|---|---|---|---|---|---|---|
| **Neon** | **$0.00** (Free) / **$19** (Launch)| 0.5 GB storage | **Built-in PgBouncer** | PostgreSQL 16 (Full `FOR UPDATE`) | Instant snapshot branching | Point-in-time branch restore |
| **Supabase** | **$0.00** (Free) / **$25** (Pro) | 500 MB storage | **Built-in Supavisor** | PostgreSQL 16 (Full `FOR UPDATE`) | Daily database dumps | Daily snapshot recovery |
| **Render Postgres** | **$7.00** / mo (30-day trial) | 1 GB storage | None built-in | PostgreSQL 16 | Daily automated snapshots | Manual snapshot restore |

---

## 2. RECOMMENDED PRODUCTION TOPOLOGY

```
                  +----------------------------------------------+
                  |            Browsers / End Users              |
                  +----------------------------------------------+
                                         |
                                         | HTTPS (TLS 1.3)
                                         v
                  +----------------------------------------------+
                  |         Vercel / Cloudflare Pages Edge       |
                  |     - Global CDN Edge Caching (HTML/JS/CSS)  |
                  |     - Sub-40ms TTFB across all continents    |
                  |     - Zero cold starts on all 20 views       |
                  |     - Automatic HTTPS & custom domain        |
                  +----------------------------------------------+
                                         |
                                         | HTTPS API (/api/*)
                                         | CORS Origin Filter
                                         v
                  +----------------------------------------------+
                  |            Railway Web Service               |
                  |     - Multi-stage Node.js 20+ Dockerfile     |
                  |     - Zero cold starts (continuous compute)  |
                  |     - Rate limiting & Helmet security        |
                  |     - Background reminder scheduler active   |
                  +----------------------------------------------+
                                         |
                                         | Pooled TLS Connection
                                         | (sslmode=require&pool_timeout=10)
                                         v
                  +----------------------------------------------+
                  |           Neon Serverless PostgreSQL         |
                  |     - Managed PostgreSQL 16.15 Engine        |
                  |     - PgBouncer Connection Pooling           |
                  |     - Pessimistic Row Locks (`FOR UPDATE`)   |
                  |     - Point-in-Time Recovery & Branching     |
                  +----------------------------------------------+
```

### Architectural Justification:
- **Cost**: Starts at **$0.00–$5.00/month**.
- **Performance**: Eliminates cold-start delays on public discovery and calendar views.
- **Relational Integrity**: 100% dialect consistency with our tested PostgreSQL 16 migrations and row-level concurrency locking.

**Status:** **RECOMMENDED & READY**
