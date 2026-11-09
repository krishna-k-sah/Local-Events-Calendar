# PHASE 6: DEPLOYMENT ARCHITECTURE EVALUATION REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Principal Cloud Solutions Architect  
**Date:** November 2026  
**Architecture Recommendation:** Tier 1 Multi-Cloud Hybrid (Vercel/Cloudflare Pages + Railway/Render + Neon PostgreSQL)  

---

## 1. COMPONENT EVALUATION MATRIX

### 1.1 Frontend Hosting Evaluation

| Provider | Free Tier | Cost / Month | Deployment Simplicity | SPA Fallback Support | CDN & Edge Performance | Cold Starts | Recommendation |
|---|---|---|---|---|---|---|---|
| **Vercel** | Generous (100 GB/mo) | $0 (Hobby) / $20 (Pro) | Exceptional (Git Push) | Native via `vercel.json` | Global Edge Network | None (Static Assets) | **Recommended (Primary)** |
| **Cloudflare Pages** | Unlimited Bandwidth | $0 (Free) / $20 (Pro) | Exceptional (Git Push) | Supported via `_redirects` | Cloudflare Anycast CDN | None (Static Assets) | **Recommended (Alternate)** |
| **Netlify** | 100 GB/mo, 300 build mins | $0 (Free) / $19 (Pro) | High (Git Push) | Supported via `_redirects` | High Global Performance | None (Static Assets) | Viable |
| **AWS S3 + CloudFront** | 12 months free tier | ~$1–3 / month | Moderate (Terraform / CI) | CloudFront Error Page rewrite | Global Edge Locations | None | Enterprise Only |

---

### 1.2 Backend Hosting Evaluation

| Provider | Free Tier | Entry Cost / Month | Deployment Model | Cold-Start Behavior | Persistent Disk Support | Environment Secrets Management | Recommendation |
|---|---|---|---|---|---|---|---|
| **Railway** | $5 one-time trial credit | ~$5–$7 / month | Dockerfile / Node.js buildpack | **Zero Cold Starts** | Supported (Volume Mounts) | Native Secrets UI & CLI | **Recommended (Primary)** |
| **Render** | 750 free compute hrs/mo | $0 (Free) / $7 (Starter) | Git-integrated web service | **15m Spin-down on Free** (50s wake) | Disks on Paid Tiers | Native Secrets UI | **Recommended (Paid)** |
| **Fly.io** | Up to 3 shared-cpu VMs | $0 / ~$5 per machine | Dockerfile (Firecracker VM) | Very fast (<2s) | Volumes Supported | Fly Secrets CLI | Viable |
| **Self-Hosted VPS** (Hetzner / DO) | None | $4–$6 / month | Docker Compose + Nginx + PM2 | **Zero Cold Starts** | Native Local NVMe | `.env` file on server | **Recommended for Self-Host** |

---

### 1.3 PostgreSQL Database Hosting Evaluation

| Provider | Free Tier | Entry Cost / Month | Engine & Version | Built-in Connection Pooling | Backup & Point-in-Time Recovery | Concurrency & Locking Support | Recommendation |
|---|---|---|---|---|---|---|---|
| **Neon** | 0.5 GB storage, autosuspend | $0 (Free) / $19 (Launch) | PostgreSQL 16 (Full Parity) | **Native PgBouncer** (Port 5432/6543) | Instant point-in-time branch | Full `FOR UPDATE` support | **Recommended (Primary)** |
| **Supabase** | 500 MB storage, 2 projects | $0 (Free) / $25 (Pro) | PostgreSQL 16 (Full Parity) | **Native Supavisor** (Port 6543) | Daily automated backups | Full `FOR UPDATE` support | **Recommended (Alternate)** |
| **Render Postgres** | 30 days free only | $7 / month | PostgreSQL 16 | Dedicated container | Automated snapshots | Full `FOR UPDATE` support | Good for all-in-one Render |
| **AWS RDS PostgreSQL** | 750 hrs/mo (Free Tier 1 yr)| ~$15–$25 / month | PostgreSQL 16.x | RDS Proxy (Extra cost) | Automated snapshots & multi-AZ| Full `FOR UPDATE` support | Overkill for initial launch |

---

## 2. RECOMMENDED PRODUCTION DEPLOYMENT ARCHITECTURE

```
                      +-----------------------------+
                      |   Public Users / Browsers   |
                      +-----------------------------+
                                     |
                                     | HTTPS (TLS 1.3)
                                     v
          +-----------------------------------------------------+
          |              Cloudflare / Vercel Edge CDN           |
          |       - Static Asset Caching (HTML/JS/CSS)          |
          |       - Automatic Let's Encrypt SSL/TLS             |
          |       - SPA Route Rewrite (/* -> index.html)        |
          +-----------------------------------------------------+
                                     |
                                     | API Requests (/api/*)
                                     | HTTPS with CORS Validation
                                     v
          +-----------------------------------------------------+
          |               Railway / Render Container            |
          |          - Node.js 24 + Express 4.21 Application    |
          |          - Rate Limiting & Helmet Security Headers  |
          |          - Background Event Reminder Scheduler      |
          |          - Structured JSON Logging                  |
          +-----------------------------------------------------+
                                     |
                                     | TLS Encrypted Connection Pool
                                     | (connection_limit=20&pool_timeout=10)
                                     v
          +-----------------------------------------------------+
          |              Neon / Supabase Managed DB             |
          |          - PostgreSQL 16.15 Database Engine         |
          |          - Row-Level Locking (Pessimistic)          |
          |          - 14 Relational Tables with Constraints    |
          |          - Automated Daily Backups & PITR           |
          +-----------------------------------------------------+
```

### Architectural Justification:
1. **Zero Cold-Start on Frontend**: Vercel/Cloudflare static hosting ensures global sub-50ms Time-to-First-Byte (TTFB) for all 20 application views.
2. **PostgreSQL 16 Parity**: Neon or Supabase delivers managed PostgreSQL 16 with native connection pooling, guaranteeing identical behavior to our local container testing.
3. **Pessimistic Row-Level Locking**: Full compatibility with our `SELECT id FROM events WHERE id = ${eventId} FOR UPDATE` transaction safeguards.
4. **Cost Efficiency**: $0/month during initial staging/beta testing on free tiers, scaling to ~$12–$15/month for continuous production SLAs without cold starts.

---

## 3. DEPLOYMENT PREREQUISITES & NEXT STEPS

- **Phase 3**: Prepare separated environment configuration templates (`.env.production`, `.env.staging`, `.env.example`).
- **Phase 4**: Prepare staging and production database migrations using Prisma.
- **Phase 5 & 6**: Configure build manifests (`vercel.json`, `_redirects`, `Dockerfile`, production npm scripts).

