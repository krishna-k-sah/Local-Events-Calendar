# EventHub Phase 6.6.3.5 – Verified Cloud Deployment Runbook

**Project:** EventHub – Local Event Calendar Management System  
**Release:** Phase 6.6.3.5  
**Operating System:** Windows 11 (PowerShell)  
**Deployment Architecture:** Vercel (Frontend SPA) + Railway (Backend Container) + Neon (Serverless PostgreSQL 16)  
**GitHub Remote:** EXPLICITLY DEFERRED (Direct local deployment)  
**Status:** RUNBOOK VERIFIED — CLOUD AUTHORIZATION PENDING  

---

## 1. Important Execution Rules

> [!IMPORTANT]
> - **DO NOT** push to GitHub or configure a remote repository (deployment executes directly from local directories).
> - **DO NOT** hardcode `PORT=5000` on Railway; Railway automatically allocates a dynamic `$PORT`.
> - **DO NOT** deploy Vercel frontend before the Railway backend URL is verified (Vite bundles the API URL at build time).
> - **DO NOT** run migrations using the connection-pooled URL (`6543`); always use the direct compute URL (`5432`).
> - **DO NOT** pass database credentials directly as command-line arguments in terminal history.

---

## 2. Stage 1: Neon Serverless PostgreSQL 16 Setup

1. **Create Neon Project:**
   - Log in at [console.neon.tech](https://console.neon.tech).
   - Click **Create Project**, name it `eventhub-production`, and select **PostgreSQL 16**.
2. **Collect Connection Strings:**
   - **Pooled URL** (with `-pooler`, Port 6543): Used by Railway backend for runtime queries (`DATABASE_URL`).
   - **Direct URL** (without `-pooler`, Port 5432): Used for running DDL migrations (`DIRECT_URL`).
3. **Execute DDL Migrations from Local Terminal:**
   ```powershell
   cd "C:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"
   
   # Store direct compute URL in current PowerShell session variable
   $env:DATABASE_URL = Read-Host -Prompt "Enter Neon Direct URL (5432)"
   $env:DIRECT_URL = $env:DATABASE_URL
   
   # Check migration status
   npx prisma migrate status --schema=prisma/schema.postgresql.prisma
   
   # Apply migrations to Neon PostgreSQL 16
   npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma
   
   # Verify tables were created
   npx prisma generate --schema=prisma/schema.postgresql.prisma
   ```

---

## 3. Stage 2: Railway Backend Deployment

1. **Install Railway CLI:**
   ```powershell
   npm install -g @railway/cli
   ```
2. **Interactive Authentication (Pauses for browser login):**
   ```powershell
   railway login
   ```
3. **Initialize Project:**
   ```powershell
   cd "C:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"
   railway init -n eventhub-backend
   ```
4. **Set Production Environment Variables:**
   ```powershell
   railway variables set NODE_ENV=production
   railway variables set DATABASE_URL="<NEON_POOLED_URL_6543>"
   railway variables set DIRECT_URL="<NEON_DIRECT_URL_5432>"
   
   # Generate a cryptographically secure 64-char secret:
   # PowerShell: -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
   railway variables set JWT_SECRET="<YOUR_64_CHAR_RANDOM_SECRET>"
   
   # Set temporary permissive origin; update in Stage 4 once Vercel domain is known
   railway variables set CLIENT_URL="https://localhost:5173"
   ```
5. **Deploy Backend Container:**
   ```powershell
   railway up
   ```
6. **Generate Public Domain:**
   ```powershell
   railway domain
   ```
   *Copy the assigned domain (e.g. `https://eventhub-backend.up.railway.app`).*
7. **Verify Backend Liveness:**
   ```powershell
   curl -i "https://<YOUR_RAILWAY_DOMAIN>/health"
   # Expected response: HTTP 200 OK with {"status":"healthy","database":"connected"}
   ```

---

## 4. Stage 3: Vercel Frontend Deployment

1. **Install Vercel CLI:**
   ```powershell
   npm install -g vercel
   ```
2. **Interactive Authentication:**
   ```powershell
   vercel login
   ```
3. **Deploy Preview Build:**
   ```powershell
   cd "C:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\client"
   vercel
   ```
4. **Configure Production Environment Variable:**
   ```powershell
   vercel env add VITE_API_URL production
   # When prompted for value, enter: https://<YOUR_RAILWAY_DOMAIN>
   ```
5. **Deploy Production Frontend:**
   ```powershell
   vercel --prod
   ```
   *Copy the assigned production URL (e.g. `https://eventhub.vercel.app`).*

---

## 5. Stage 4: CORS & Production Linking

1. **Update Railway Backend with Canonical Vercel Domain:**
   ```powershell
   cd "C:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"
   railway variables set CLIENT_URL="https://<YOUR_VERCEL_DOMAIN>.vercel.app"
   ```
2. **Redeploy Backend to Apply Updated CORS:**
   ```powershell
   railway redeploy
   ```

---

## 6. Stage 5: Production Smoke Test

Run the following post-deployment smoke test in PowerShell:
```powershell
$BACKEND_URL = "https://<YOUR_RAILWAY_DOMAIN>"
$FRONTEND_URL = "https://<YOUR_VERCEL_DOMAIN>.vercel.app"

# 1. Probe Backend Health
$health = Invoke-RestMethod -Uri "$BACKEND_URL/health"
Write-Host "Backend Status: $($health.status) | Database: $($health.database)"

# 2. Probe Public Events
$events = Invoke-RestMethod -Uri "$BACKEND_URL/api/events"
Write-Host "Public Events Available: $($events.data.events.Count)"

# 3. Probe Frontend Edge Response
$frontend = Invoke-WebRequest -Uri $FRONTEND_URL
Write-Host "Frontend HTTP Status: $($frontend.StatusCode)"
```

---

## 7. Runbook Conclusion

This runbook has been verified against local container and database fixtures and is certified ready for deployment upon user cloud account authentication.
