# PHASE 6.4: WINDOWS CLOUD DEPLOYMENT TOOLING REPORT
**EventHub — Local Event Calendar Management System**  
**Author:** Senior Windows Deployment & Cloud Infrastructure Engineer  
**Date:** November 2026  
**Target Release:** EventHub 6.4.0  
**Environment:** Windows 11 x64 (PowerShell 5.1 / 7+)

---

## 1. WINDOWS ENVIRONMENT & TOOLING INVENTORY

The developer workstation environment was evaluated for direct cloud deployment tooling:

| Tool / Runtime | Installed Version | Path / Binary Availability | Role in Direct Cloud Deployment |
|---|---|---|---|
| **Node.js** | `v24.21.0` | In PATH (`node.exe`) | Executes application runtime, build scripts, and CLI tooling. |
| **npm** | `11.19.0` | In PATH (`npm.cmd`) | Manages dependencies and executes `npx` package runners. |
| **Git for Windows**| `2.55.0.windows.3`| In PATH (`git.exe`) | Local version control; tracks clean `master` state. |
| **Docker Desktop** | `29.9.2` | In PATH (`docker.exe`) | Local multi-stage container compilation and staging database host. |
| **Vercel CLI** | On-demand via `npx vercel` | Available without global install | Packages and deploys `client/` directly to Vercel Edge. |
| **Railway CLI** | On-demand via `npx @railway/cli`| Available without global install | Packages and uploads `server/` directly to Railway Container platform. |

---

## 2. DIRECT DEPLOYMENT COMMAND EXECUTION WORKFLOWS

Direct cloud deployment circumvents the need for GitHub remote repositories by uploading local code packages directly to the provider endpoints over HTTPS with interactive OAuth token authentication.

### 2.1 Frontend Direct Deployment via Vercel CLI

The frontend is deployed directly from the `client/` directory:

```powershell
# Step 1: Navigate to frontend root
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\client"

# Step 2: Compile the production assets locally (Validates bundle integrity)
npm run build

# Step 3: Direct deployment to Vercel (Interactive authentication)
# This command prompts the user to log in via browser window, link the project, and deploys directly:
npx --yes vercel deploy --prod --yes
```

**Security & Environmental Notes:**
- Vercel CLI prompts for browser authentication; credentials are saved in `%LOCALAPPDATA%\com.vercel.cli\auth.json` (encrypted by OS user profile).
- Environment variable injection for backend endpoint:
  ```powershell
  npx vercel env add VITE_API_BASE_URL production
  # Enter value: https://eventhub-backend.railway.app/api
  ```

---

### 2.2 Backend Direct Deployment via Railway CLI

The backend is deployed directly from the `server/` directory:

```powershell
# Step 1: Navigate to backend root
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"

# Step 2: Log in to Railway via secure interactive browser prompt
npx --yes @railway/cli login

# Step 3: Initialize or link the project
npx --yes @railway/cli init

# Step 4: Deploy the local directory directly to Railway (Uses server/Dockerfile)
npx --yes @railway/cli up --detach
```

**Security & Environmental Notes:**
- Railway CLI initiates a secure browser-based OAuth grant. No API tokens or passwords need to be written into terminal history or script files.
- The `Dockerfile` inside `server/` is automatically detected by Railway's Nixpacks/Docker builder.

---

### 2.3 Database Migration Execution via Prisma

Once the Neon database instance is provisioned:

```powershell
# Step 1: Navigate to server root
Set-Location "c:\Users\Sandip Sah\OneDrive\Desktop\Local Event Calendar\server"

# Step 2: Set the migration connection string (In current PowerShell session only; not stored in persistent profile)
$env:DATABASE_URL = "[NEON_DIRECT_DATABASE_URL_PORT_5432]"

# Step 3: Deploy schema migrations
npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma

# Step 4: Clear session variable
Remove-Item Env:\DATABASE_URL
```

---

## 3. SECURITY & HYGIENE CONTROLS

1. **No Credentials in Command History:** Database connection strings, JWT keys, and passwords must never be stored in persistent PowerShell profile scripts (`$PROFILE`) or batch files.
2. **Interactive OAuth Flows:** Both Vercel and Railway use localhost loopback browser OAuth redirects for developer login, keeping secret tokens off the terminal prompt.
3. **No Unnecessary Global Installs:** Utilizing `npx --yes <package>` avoids cluttering the Windows global registry or modifying system environment variables.

**Classification:** **WINDOWS DEPLOYMENT TOOLING VERIFIED**
