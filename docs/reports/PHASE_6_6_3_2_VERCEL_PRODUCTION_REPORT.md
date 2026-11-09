# PHASE 6.6.3.2 — VERCEL PRODUCTION DEPLOYMENT REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.2  
**Target Platform:** Vercel Global Edge Network  
**Deployment Strategy:** Direct CLI Production Promotion (Without GitHub)  
**Status:** **PROMOTION GATED — PENDING PREVIEW VERIFICATION & CLOUD OAUTH**

---

## 1. Verification State Breakdown

- [x] **Verified Locally:** Clean production build artifacts, cache-control headers (`client/vercel.json`), zero embedded secrets.
- [ ] **Pending User Authorization:** User completion of Vercel CLI login.
- [ ] **Pending Cloud Execution:** Production promotion deployment (`npx vercel deploy --prod ...`).
- [ ] **Not Tested:** Public canonical domain SSL handshake, global CDN propagation.

---

## 2. Production Promotion Execution Runbook

Once the preview deployment passes all browser tests, promote the client to production:

```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\client"

# Promote preview to canonical production deployment
npx vercel deploy --prod --build-env VITE_API_URL="https://[YOUR-RAILWAY-SERVICE].up.railway.app"
```

*Expected Output:*
```
Production: https://eventhub-client.vercel.app [copied to clipboard]
```

---

## 3. CORS Synchronization on Backend

Update Railway's `CLIENT_URL` to permit the production Vercel origin:
```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"
npx @railway/cli variable set CLIENT_URL="https://[YOUR-VERCEL-PRODUCTION-DOMAIN].vercel.app"
```

*Verification:* Confirm that browser cross-origin requests from the production Vercel frontend succeed with valid `Access-Control-Allow-Origin` headers.
