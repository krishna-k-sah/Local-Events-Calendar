# EventHub Phase 6.6.3.6 – CORS & Service Integration Audit Report

**Project:** EventHub – Local Event Calendar Management System  
**Phase:** Phase 6.6.3.6  
**Subject:** Cross-Origin Resource Sharing (CORS), Preflight Handling & Cross-Service Interoperability  
**Execution Timestamp:** 2026-11-09T22:49:00+05:30  
**Overall Status:** CORS MIDDLEWARE LOGIC VERIFIED — CLOUD DOMAIN LINKING BLOCKED (PENDING CLOUD PROVISIONING)  

---

## 1. Executive Summary

This report evaluates the cross-origin security architecture between the Vercel edge frontend and the Railway container backend. The CORS middleware in `server/src/app.js` is implemented to enforce strict origin whitelisting in production, completely avoiding wildcard `*` vulnerabilities.

Because neither the live Railway backend nor the live Vercel frontend domains exist yet in the cloud, live HTTP cross-origin integration tests cannot be run against live URLs.

---

## 2. Status Categorization Matrix

| Component / Requirement | Verified Specification | Execution Status | Evidence / Notes |
|---|---|---|---|
| **Restricted Origin Whitelist** | Reads comma-separated `CLIENT_URL` | **VERIFIED** | Enforced in `server/src/app.js` |
| **No Wildcard CORS in Prod** | Blocks origin `*` when `NODE_ENV=production`| **VERIFIED** | Production rejects non-whitelisted origins |
| **OPTIONS Preflight Handling** | Returns 204 with allowed headers & methods | **VERIFIED** | Handles `Authorization`, `Content-Type` |
| **Credentials Allowance** | `credentials: true` | **VERIFIED** | Supports Authorization Bearer headers |
| **Live Vercel Domain Ingestion** | Setting Railway `CLIENT_URL` to Vercel domain | **NOT TESTED** | Pending Vercel domain creation |
| **Live Browser Cross-Origin Query**| Real browser fetch from Vercel to Railway | **NOT TESTED** | Pending live service deployment |
| **Unauthorized Origin Rejection**| HTTP request with `Origin: evil.com` | **VERIFIED (LOCAL)** | Handled by local automated test suites |

---

## 3. CORS Architecture in `server/src/app.js`

```javascript
const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = isProduction
  ? configuredOrigins
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...configuredOrigins,
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS Error: Origin ${origin} not permitted.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## 4. Live Cloud Linking Procedure (Post-Deployment)

Once Vercel and Railway are provisioned:
1. Copy the assigned Vercel canonical URL (e.g. `https://eventhub.vercel.app`).
2. Update Railway configuration:
   ```powershell
   cd server
   railway variables set CLIENT_URL="https://eventhub.vercel.app"
   railway redeploy
   ```
3. Verify OPTIONS preflight response:
   ```powershell
   curl -I -X OPTIONS "https://<RAILWAY_URL>/api/events" `
     -H "Origin: https://eventhub.vercel.app" `
     -H "Access-Control-Request-Method: GET"
   # Verify Access-Control-Allow-Origin: https://eventhub.vercel.app is returned
   ```

---

## 5. Audit Conclusion

CORS middleware logic is certified secure. Cloud cross-service linking status: **BLOCKED (PENDING CLOUD PROVISIONING)**.
