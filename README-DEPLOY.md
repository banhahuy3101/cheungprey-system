# Deployment & Environment Guide (README-DEPLOY)

Comprehensive guide for running locally and deploying the Cheung Prey System across **UAT** and **Production** environments with complete database isolation.

---

## 1. System Architecture

* **Frontend**: React + Vite SPA with Khmer typography and dynamic RBAC.
  * Local: `http://localhost:5173` (proxies `/api` to local backend)
  * Production: `https://cheung-prey-system.onrender.com`
* **Backend**: Go (Gin) REST API + Headless Chromium for PDF rendering.
  * Local: `http://localhost:8080`
  * Production: `https://cheungprey-api.onrender.com`
* **Database & Authentication**: Supabase (PostgreSQL 17, PostgREST, GoTrue Auth).

---

## 2. Environment & Database Isolation

> [!IMPORTANT]
> **Production and UAT databases are strictly separated.** 
> Local development and UAT **MUST ONLY** point to `uat-cheungprey-db`. 
> Production servers **MUST ONLY** point to the production database.

### Environment Matrix

| Parameter | Local Dev & UAT | Production Server |
| :--- | :--- | :--- |
| **Database Project** | `uat-cheungprey-db` | Production Supabase |
| **Project Ref** | `njppnroanhlqhitfblkx` | `lqypfqoslyivbtnrfaex` |
| **Supabase URL** | `https://njppnroanhlqhitfblkx.supabase.co` | `https://lqypfqoslyivbtnrfaex.supabase.co` |
| **Publishable Key** | `sb_publishable_1RHbZPOSKv4W-A3pupgRIA_UQr9kjn2` | `sb_publishable_v91n_AcoroKXFpHIWzh9Nw_uHH-_7u6` |
| **Direct Pooler Host** | `aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres` | Production Pooler Host |
| **Config Source** | `backend/.env` / `backend/.env.uat` | Render Dashboard Env Vars / `backend/.env.production` |

---

## 3. Local Development Runbook

### Prerequisites
* Go 1.24+
* Node.js 18+ and npm
* (Optional) PostgreSQL client `psql`

### Step 1: Run Backend (Port 8080)
```bash
cd backend
# Backend automatically loads .env (pointing to uat-cheungprey-db)
go run cmd/api/main.go
```
*Healthcheck:* `curl http://localhost:8080/health` (returns `{"status":"ok"}`)

### Step 2: Run Frontend (Port 5173)
```bash
cd frontend
npm install
npm run dev
```
*Access UI:* Open `http://localhost:5173` in your browser.

---

## 4. Production Deployment on Render

Deployments are automated via [`render.yaml`](file:///Users/banhahuy/Documents/cheungprey-system/render.yaml) or configured manually in the Render Dashboard.

### Service 1: Backend API (`cheungprey-api`)
* **Type**: Web Service
* **Runtime**: Docker
* **Root Directory**: `backend`
* **Dockerfile Path**: `./Dockerfile`
* **Health Check Path**: `/health`
* **Port**: `8080`

**Required Environment Variables in Render Dashboard:**
```ini
PORT=8080
SUPABASE_URL=https://lqypfqoslyivbtnrfaex.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_v91n_AcoroKXFpHIWzh9Nw_uHH-_7u6
SUPABASE_SECRET_KEY=<PRODUCTION_SERVICE_ROLE_KEY>
SUPABASE_JWKS_URL=https://lqypfqoslyivbtnrfaex.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_DB_PASSWORD=<PRODUCTION_DB_PASSWORD>
CORS_ORIGIN=https://cheung-prey-system.onrender.com,https://cheungprey-web.onrender.com
FRONTEND_URL=https://cheung-prey-system.onrender.com
CHROME_PATH=/usr/bin/chromium
TELEGRAM_BOT_TOKEN=8777424140:AAHrnq1Dr5YwykbDrg0rA-oDAh5ckUymdZU
TELEGRAM_CHAT_ID=935504873
```

### Service 2: Frontend Web (`cheungprey-web`)
* **Type**: Web Service
* **Runtime**: Docker
* **Root Directory**: `frontend`
* **Dockerfile Path**: `./Dockerfile`
* **Health Check Path**: `/`

**Required Environment Variables in Render Dashboard:**
```ini
API_UPSTREAM=https://cheungprey-api.onrender.com
```

---

## 5. Database Migrations Runbook

Migrations are stored in chronological order in [`backend/migrations/`](file:///Users/banhahuy/Documents/cheungprey-system/backend/migrations/) and [`backend/supabase/migrations/`](file:///Users/banhahuy/Documents/cheungprey-system/backend/supabase/migrations/).

### Applying to UAT (`uat-cheungprey-db`)
```bash
PGPASSWORD='<UAT_DB_PASSWORD>' psql \
  -h aws-0-ap-northeast-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.njppnroanhlqhitfblkx \
  -d postgres \
  -f backend/migrations/<MIGRATION_FILE>.sql
```

### Applying to Production
```bash
PGPASSWORD='<PROD_DB_PASSWORD>' psql \
  -h <PROD_POOLER_HOST> \
  -p 6543 \
  -U postgres.lqypfqoslyivbtnrfaex \
  -d postgres \
  -f backend/migrations/<MIGRATION_FILE>.sql
```

---

## 6. How to Ensure Database Table & Column Parity (UAT vs Production)

To guarantee that tables and columns in Production match UAT 100%:

### Method A: Automated Comparison Script
Run the built-in comparison script:
```bash
./backend/scripts/compare_db_schema.sh
```
*The script outputs:*
- `✅ SUCCESS: All public tables and columns are IDENTICAL!`
- Or a list of exact missing columns / type differences (`-` for UAT only, `+` for Production only).

### Method B: One-Click Production Migration Sync
To apply all missing tables and columns to Production in one go:
1. **Consolidated Migration File**:
   [`backend/migrations/sync_uat_to_production.sql`](file:///Users/banhahuy/Documents/cheungprey-system/backend/migrations/sync_uat_to_production.sql) bundles all missing schema changes (`042`, `044`, `046`, `047`, `048`, `049`).
2. **Apply in Supabase Dashboard**:
   * Open your **Production Supabase SQL Editor**: [https://supabase.com/dashboard/project/lqypfqoslyivbtnrfaex/sql](https://supabase.com/dashboard/project/lqypfqoslyivbtnrfaex/sql)
   * Copy the content of [`sync_uat_to_production.sql`](file:///Users/banhahuy/Documents/cheungprey-system/backend/migrations/sync_uat_to_production.sql) and paste it into the editor.
   * Click **Run**.
3. **Runner Script**:
   ```bash
   ./backend/scripts/run_missing_migrations.sh
   ```
   This script executes the sync and runs the schema diff verification immediately afterward.

### Method C: SQL Verification Query (Supabase Dashboard)
Run this query in the **SQL Editor** of both UAT and Production projects to view table and column definitions:
```sql
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### Method D: Migration Version Verification
Check applied migrations in both databases:
```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC;
```
If both UAT and Production report the same highest migration version (e.g. `20260910280000`), the schemas are in sync.

---

## 7. Safety & Security Verification

1. **Docker Clean Image**:
   The [`backend/Dockerfile`](file:///Users/banhahuy/Documents/cheungprey-system/backend/Dockerfile) only packages the compiled Go binary and fonts. It **never** includes or bakes `.env` files into Docker images.
2. **Git Hygiene**:
   All `.env`, `.env.*`, and temporary test artifacts are permanently excluded via [`.gitignore`](file:///Users/banhahuy/Documents/cheungprey-system/.gitignore).
3. **No AWS Footprint**:
   All legacy AWS ECS scripts and binaries have been removed. Deployments use standardized Docker containers on Render.
