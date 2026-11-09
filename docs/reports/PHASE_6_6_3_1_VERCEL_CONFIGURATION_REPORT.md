# PHASE 6.6.3.1 — VERCEL CONFIGURATION AUDIT REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.1  
**Deployment Target:** Vercel Global Edge Network  
**Application Architecture:** React 18 + Vite SPA  
**Status:** **ROUTING & API NORMALIZATION VERIFIED**

---

## 1. Supported Frontend Environment Variables

Inspected [`client/src/services/api.js`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/client/src/services/api.js#L3-L9):

```javascript
const rawBaseURL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';
const strippedBaseURL = (rawBaseURL || '').replace(/\/+$/, '');
const normalizedBaseURL = strippedBaseURL.endsWith('/api')
  ? strippedBaseURL
  : (strippedBaseURL ? `${strippedBaseURL}/api` : '/api');
```

- **Precedence:** `VITE_API_BASE_URL` is evaluated first; if omitted, `VITE_API_URL` is used; if both are omitted, it defaults to relative `'/api'`.
- **Security Check:** All Vite environment variables are prefixed with `VITE_` and bundled into public client JavaScript. Zero secrets (JWT secrets, private keys, database URLs) are ever referenced or bundled into Vite variables.

---

## 2. Empirical Verification of URL Normalization

A comprehensive unit test was executed against all expected cloud configuration variants:

| Test Case | Environment Input | Normalized BaseURL | Verification Outcome |
|---|---|---|---|
| **Case 1** | Origin without trailing slash (`https://backend.railway.app`) | `https://backend.railway.app/api` | **PASS** — `/api` appended |
| **Case 2** | Origin with trailing slash (`https://backend.railway.app/`) | `https://backend.railway.app/api` | **PASS** — Slash trimmed, `/api` appended |
| **Case 3** | Origin ending in `/api` (`https://backend.railway.app/api`) | `https://backend.railway.app/api` | **PASS** — Preserved cleanly |
| **Case 4** | Origin ending in `/api/` (`https://backend.railway.app/api/`) | `https://backend.railway.app/api` | **PASS** — Trailing slash trimmed |
| **Case 5** | Local development proxy (`/api`) | `/api` | **PASS** — Forwarded to Vite local proxy |
| **Case 6** | Local development proxy with slash (`/api/`) | `/api` | **PASS** — Normalized to `/api` |
| **Case 7** | Empty or unset (`""`) | `/api` | **PASS** — Safe fallback to `/api` |

*Conclusion:* In all scenarios, frontend services (which call relative paths like `/events`, `/auth/login`, `/tickets`) consistently resolve to valid `/api/...` backend routes without 404 errors.

---

## 3. SPA Routing & Caching (`client/vercel.json`)

Inspected [`client/vercel.json`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/client/vercel.json):

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

- **SPA Direct Access & Refresh:** Rewrites all deep paths (e.g. `/events/cuid123`, `/admin/reports`, `/calendar`) to `/index.html`, eliminating 404 errors on browser page reloads.
- **Cache Optimization:** Chunks in `/assets/` are content-hashed by Vite and cached immutably for 1 year.

---

## 4. Two-Stage Vercel Rollout Plan

To ensure zero downtime:

1. **Stage 1: Preview Deployment:**
   ```powershell
   Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\client"
   npx vercel --build-env VITE_API_URL="https://[YOUR-RAILWAY-DOMAIN]"
   ```
   *Action:* Validates build on Vercel preview domain (`https://*-username.vercel.app`) and tests real network calls against Railway.

2. **Stage 2: Production Promotion:**
   ```powershell
   npx vercel deploy --prod --build-env VITE_API_URL="https://[YOUR-RAILWAY-DOMAIN]"
   ```
   *Action:* Promotes verified build to live production canonical URL.
