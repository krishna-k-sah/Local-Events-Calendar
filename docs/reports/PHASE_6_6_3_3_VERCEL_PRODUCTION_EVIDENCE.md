# PHASE 6.6.3.3 — VERCEL PRODUCTION DEPLOYMENT EVIDENCE REPORT
**Project:** EventHub – Local Event Calendar Management System  
**Release Target:** 6.6.3.3  
**Target Platform:** Vercel Global Edge Network  
**Deployment Strategy:** Direct CLI Production Promotion (Without GitHub)  
**Status:** **GATED AT PREVIEW APPROVAL BOUNDARY**

---

## 1. Production Promotion Runbook (PowerShell)

Execute immediately following successful verification of the preview stage:

```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\client"

# Promote to Canonical Production Deployment
npx vercel deploy --prod --build-env VITE_API_URL="https://[YOUR-RAILWAY-SERVICE-DOMAIN].up.railway.app"
```

*Expected Output:*
```
Production: https://eventhub-client.vercel.app [copied to clipboard]
```

---

## 2. Backend CORS Synchronization

Update Railway's `CLIENT_URL` to permit the production canonical Vercel origin:

```powershell
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"
npx @railway/cli variable set CLIENT_URL="https://[YOUR-VERCEL-CANONICAL-DOMAIN].vercel.app"
```

*Verification:*
- Request with header `Origin: https://[YOUR-VERCEL-CANONICAL-DOMAIN].vercel.app` receives `Access-Control-Allow-Origin: https://[YOUR-VERCEL-CANONICAL-DOMAIN].vercel.app`.
- Requests from unauthorized origins are rejected by CORS middleware.

---

## 3. Production Verification Checklist

- [ ] Production URL loads over HTTPS with valid certificate.
- [ ] All 20 frontend views are accessible via client routing.
- [ ] Global CDN delivers immutable chunks with `Cache-Control: public, max-age=31536000, immutable`.
- [ ] Zero build warnings, console errors, or unhandled exceptions.
