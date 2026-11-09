# PHASE 6.6.3.3 — VERCEL PREVIEW DEPLOYMENT EVIDENCE REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.3  
**Target Platform:** Vercel Global Edge Network  
**Deployment Strategy:** Direct CLI Preview Deployment (Without GitHub)  
**Status:** **GATED AT INTERACTIVE OAUTH BOUNDARY**

---

## 1. Local Build & Configuration Evidence

Prior to preview deployment, the frontend build was verified:

- **Build Engine:** Vite v5.4.21 (Rollup)
- **Compilation Duration:** 12.25 seconds
- **Chunk Distribution:** 44 code-split chunks + 1 CSS bundle
- **Initial Load Bundle Size:** ~85 kB gzip
- **SPA Rewrites:** [`client/vercel.json`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/client/vercel.json) rewrites `/(.*)` to `/index.html` to guarantee zero 404s on browser reloads of nested routes.
- **URL Normalization:** In [`client/src/services/api.js`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/client/src/services/api.js#L3-L9), all 7 test cases passed, guaranteeing that requests always route to `/api/...` regardless of whether `VITE_API_URL` includes a trailing slash or omits `/api`.
- **Secret Scan:** Verified zero hardcoded `localhost:5000` URLs or private keys in `client/dist/assets/*.js`.

---

## 2. Interactive Vercel Preview Deployment Runbook (PowerShell)

Execute the following commands from the `client/` directory:

```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\client"

# Step 1: Interactive Browser Authentication
npx vercel login

# Step 2: Deploy Preview Stage (Linked to Railway Backend)
npx vercel --build-env VITE_API_URL="https://[YOUR-RAILWAY-SERVICE-DOMAIN].up.railway.app"
```

*Expected Output:*
```
Linked to user-project (created .vercel)
Inspect: https://vercel.com/...
Preview: https://eventhub-client-[hash].vercel.app
```

---

## 3. Preview Verification Checklist

Open the generated Preview URL in your browser and verify:
- [ ] Landing page renders hero banner and featured cards without layout shifts.
- [ ] Direct navigation to `/events` and `/calendar` works.
- [ ] Browser page refresh (F5) on `/events` re-renders without 404.
- [ ] Browser Network tab shows API calls targeting `https://[RAILWAY-SERVICE-DOMAIN].up.railway.app/api/...`.
- [ ] Browser Console shows 0 CORS errors.
