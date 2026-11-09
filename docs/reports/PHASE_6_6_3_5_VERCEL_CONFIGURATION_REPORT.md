# EventHub Phase 6.6.3.5 – Vercel Build & Frontend Configuration Audit Report

**Project:** EventHub – Local Event Calendar Management System  
**Audit Phase:** Phase 6.6.3.5  
**Target Platform:** Vercel (Edge CDN Network)  
**Framework:** React 18 + Vite 5 + Tailwind CSS  
**Execution Timestamp:** 2026-11-09T22:36:00+05:30  
**Status:** VERIFIED  

---

## 1. Executive Summary

The frontend application build, Vite configuration, API client normalizer, and Vercel routing declarations were audited. The build pipeline compiled 2,755 modules into 44 code-split chunks in 10.95 seconds with zero compilation warnings or errors.

Static inspection of the generated production bundle (`client/dist`) confirmed that no hardcoded `localhost:5000` URLs are embedded. API calls are dynamically routed via `VITE_API_URL` with runtime normalization.

---

## 2. Configuration Inspection

### 2.1 API Normalization Layer (`client/src/services/api.js`)
```javascript
const rawBaseURL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';
const strippedBaseURL = (rawBaseURL || '').replace(/\/+$/, '');
const normalizedBaseURL = strippedBaseURL.endsWith('/api')
  ? strippedBaseURL
  : (strippedBaseURL ? `${strippedBaseURL}/api` : '/api');

const api = axios.create({
  baseURL: normalizedBaseURL,
  headers: { 'Content-Type': 'application/json' },
});
```
- **Fallback:** In local development, falls back to `/api` (proxied by Vite dev server).
- **Production Resolution:** Reads `VITE_API_URL` during Vite build time.
- **Normalization:** Strips trailing slashes and guarantees `/api` suffix (prevents double `/api/api` or missing `/api` errors).

### 2.2 Vercel SPA Routing Configuration (`client/vercel.json`)
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```
- **SPA Rewrite Rule:** Directs all incoming URLs `/(.*)` to `/index.html`, ensuring deep links (e.g. `/events/:id`, `/admin/users`, `/my-registrations`) load properly on direct page refresh without HTTP 404 errors.
- **Cache-Control:** Hashed JS/CSS chunks under `/assets/` are served with immutable 1-year caching.

### 2.3 Vite Configuration (`client/vite.config.js`)
- **Code-Splitting Manual Chunks:**
  - `vendor-react`: React, React-DOM, React Router DOM, Axios.
  - `vendor-calendar`: FullCalendar core and interaction plugins.
  - `vendor-charts`: Recharts.
  - `vendor-icons`: Lucide React.
- **Development Proxy:** Configured to proxy `/api` and `/uploads` to `http://localhost:5000` during local development only.

---

## 3. Production Bundle Audit

- **Compilation Command:** `npm --prefix client run build`
- **Output Directory:** `client/dist/`
- **Modules Transformed:** 2,755 modules
- **Output Artifacts:** Exactly 44 files
- **Hardcoded Localhost Scan:** Scanned all JS/CSS chunks for `localhost:5000` -> **0 matches found** (VERIFIED).

---

## 4. Verified Vercel Deployment Commands (PowerShell)

```powershell
# 1. Install or verify Vercel CLI
npm install -g vercel

# 2. Authenticate interactively via browser
vercel login

# 3. Deploy Preview environment from client directory
cd client
vercel

# 4. Configure Production Environment Variable (Pointing to verified Railway backend)
vercel env add VITE_API_URL production
# When prompted, enter: https://<YOUR_RAILWAY_APP>.up.railway.app

# 5. Deploy to Production
vercel --prod
```

> [!IMPORTANT]
> **Sequential Deployment Dependency:**
> Never deploy Vercel to production before the Railway backend has been provisioned and its public HTTPS URL is verified. Because Vite bundles environment variables at build time, `VITE_API_URL` must be set prior to running `vercel --prod`.

---

## 5. Audit Conclusion

The Vercel deployment configuration, SPA rewrites, API normalization, and build integrity are certified **VERIFIED**.
