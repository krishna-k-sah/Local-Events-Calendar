# PHASE 6.6.3.2 — VERCEL PREVIEW DEPLOYMENT REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.2  
**Target Platform:** Vercel Global Edge Network  
**Deployment Strategy:** Direct CLI Preview Deployment (Without GitHub)  
**Status:** **BUILD & ROUTING VERIFIED LOCALLY — PENDING CLOUD ACTIVATION**

---

## 1. Verification State Breakdown

- [x] **Verified Locally:** Vite production build (12.25s, 44 chunks), SPA routing rewrites (`client/vercel.json`), URL normalization logic (7 unit test cases passing), zero hardcoded localhost strings in `dist/`.
- [ ] **Pending User Authorization:** Interactive browser authentication (`npx vercel login`).
- [ ] **Pending Cloud Execution:** Preview deployment execution (`npx vercel --build-env ...`).
- [ ] **Not Tested:** Live preview domain browser rendering and network requests.

---

## 2. URL Normalization Validation Summary

In [`client/src/services/api.js`](file:///c:/Users/Sandip%20Sah/OneDrive/Desktop/Local%20Event%20Calendar/client/src/services/api.js#L3-L9):
- `VITE_API_BASE_URL` takes precedence over `VITE_API_URL`.
- Strips trailing slashes and ensures `/api` is present.
- All 7 edge-case test runs passed:
  - `https://backend.railway.app` -> `https://backend.railway.app/api`
  - `https://backend.railway.app/` -> `https://backend.railway.app/api`
  - `https://backend.railway.app/api` -> `https://backend.railway.app/api`
  - `https://backend.railway.app/api/` -> `https://backend.railway.app/api`
  - `/api` -> `/api`
  - `/api/` -> `/api`
  - `""` -> `/api`

---

## 3. Preview Deployment Execution Runbook

Run from `client/`:
```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\client"

# 1. Interactive OAuth
npx vercel login

# 2. Deploy preview stage linked to Railway backend
npx vercel --build-env VITE_API_URL="https://[YOUR-RAILWAY-SERVICE].up.railway.app"
```

### Preview Verification Checklist:
- [ ] Preview URL returns HTTP 200 and loads LandingPage.
- [ ] Deep links (e.g. `/events`, `/calendar`) survive browser refresh without 404.
- [ ] Browser console shows 0 CORS errors.
- [ ] Network tab confirms XHR requests target the Railway domain.
