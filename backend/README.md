# Cheungprey Backend

Go REST API with Supabase integration, JWT auth, nightly cron, and Telegram logging.

## Prerequisites

- Go 1.26+
- Supabase project (database, auth, storage)
- [Optional] Telegram bot for request logging

## Setup

```bash
cp .env.example .env
```

Get Supabase values from **Project Settings → API**:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Anon/public key (RLS-scoped) |
| `SUPABASE_SECRET_KEY` | Service role key (bypasses RLS) |
| `SUPABASE_JWKS_URL` | `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` |
| `TELEGRAM_BOT_TOKEN` | [Optional] Telegram bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | [Optional] Telegram chat ID for logs |

## Run

```bash
lsof -ti:8080 | xargs kill -9 2>/dev/null; sleep 1; echo "port 8080 freed"
go run ./cmd/api
```

Server starts on port `8080` (override via `PORT`).

## Build

```bash
go build -o bin/api ./cmd/api
./bin/api
```

## Deploy (Render)

Set **Root Directory** to `backend`:

| Setting | Value |
|---|---|
| Build Command | `go build -o app ./cmd/api` |
| Start Command | `./app` |

Or use `render.yaml` Blueprint (Docker includes Chromium for PDF reports).

Required env vars: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`.
Optional: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `CHROME_PATH=/usr/bin/chromium`.

## Architecture

```
cmd/
├── api/main.go          # Entry point
└── seedzones/main.go    # Zone seeding

internal/
├── auth/                # JWT verification, RBAC middleware
├── cron/                # Nightly scheduler (Supabase keep-alive + counts)
├── handlers/            # Gin HTTP handlers
├── models/              # Domain types
├── repository/          # Supabase client + DB operations
└── service/             # Business logic layer

pkg/
├── config/              # Env config loader
├── middleware/          # CORS, Telegram logging
├── pdf/                 # Headless Chromium PDF generation
├── periodlabel/         # Khmer period label formatting
└── utils/               # Response helpers
```

## Nightly Cron

Runs every midnight Cambodia time (UTC+7). Two jobs:

| Job | What it does |
|---|---|
| **Ping Supabase** | Lightweight SELECT on 7 core tables to prevent free-tier pausing |
| **Module Counts** | Row counts across key tables (users, reports, transactions, etc.) |

Results are logged to console and sent to Telegram if configured.

### API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/cron/status` | Admin JWT | View scheduler state, last/next run, job logs |
| `POST` | `/api/admin/cron/run` | Admin JWT | Trigger all jobs immediately |

### Telegram notification format

```
🕛 Nightly Maintenance — 2026-08-09 00:00
Completed in 245ms

✅ Ping Supabase (120ms)
  • profiles: OK
  • role_permissions: OK
  • report_documents: OK
  ...

✅ Module Counts (125ms)
  • Users: 15
  • Report Documents: 42
  ...
```

## Telegram Request Logging

Every API request is sent to your Telegram chat. Configure `.env`:

```env
TELEGRAM_BOT_TOKEN=1234567890:AA...
TELEGRAM_CHAT_ID=935504873
```

### How to get credentials

1. Chat with [@BotFather](https://t.me/BotFather), send `/newbot`, save the token
2. Send any message to your bot, then visit:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
3. Copy `chat.id` from the JSON response

### Log format

```
📥 Response Log
👤 User: admin@cheungprey.org
📱 Model: iPhone 15 Pro
📦 Version: 2.0.6 (Build 23)
📌 PUT https://cheungprey-system.onrender.com/api/members/abc-123
⏰ 2026-08-08 11:30:05

✅ Status: 200 OK | Latency: 12.1ms

🔙 Before:
{"name":"Sok","age":35,"zone_id":"zn-1"}

📤 Request Body
{"name":"Sokheng","age":36,"zone_id":"zn-1"}

📖 Response Body
{"success":true,"data":{"id":"abc-123","name":"Sokheng","age":36}}
```

| Field | Source |
|---|---|
| 👤 User | JWT email (authenticated) or `guest` |
| 📱 Model | `User-Agent` header |
| 📦 Version | `X-App-Version` header |
| 🔙 Before | DB query (PUT/PATCH only) |
| 📤 Request Body | Always (sensitive fields masked as `***`) |
| 📖 Response Body | Always (truncated to 4000 chars) |

If env vars are not set, the middleware does nothing — no performance impact.

### Emoji legend

| Emoji | Meaning |
|---|---|
| ✅ | 2xx success |
| ⚠️ | 4xx client error |
| 🔥 | 5xx server error |

## API Routes

### Public

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/register` | Register |
| `POST` | `/api/auth/refresh` | Refresh JWT |

### Authenticated (JWT required)

| Method | Path | Feature | Description |
|---|---|---|---|
| `GET` | `/api/profile` | — | Get profile |
| `PUT` | `/api/profile` | — | Update profile |
| `GET` | `/api/permissions/features` | — | List available features |
| `GET` | `/api/hierarchy/*` | — | Province/district/commune/village tree |
| `GET` | `/api/party/zones` | — | List zones |
| `GET` | `/api/party/zones/tree` | — | Zone tree |
| `GET` | `/api/party/structures` | — | Party structures |
| `POST/GET/PUT/DELETE` | `/api/party/members[/:id]` | Members | Member CRUD |
| `POST/GET` | `/api/party/voters` | Voters | Voter CRUD |
| `POST/GET/DELETE` | `/api/party/files[/:id]` | Files | File upload/CURD |
| `POST/GET/PUT/DELETE` | `/api/records[/:id]` | Records | Record CRUD |
| `GET` | `/api/reports/members` | Reports | Member report |
| `GET` | `/api/reports/performance/:zone/:period` | Reports | Performance report |
| `POST/GET/PUT/DELETE` | `/api/report-documents[/:id]` | Reports | Document CRUD |
| `POST/GET/PUT/DELETE` | `/api/report-templates[/:id]` | Reports | Template CRUD |
| `GET/POST/PUT/DELETE` | `/api/performance/*` | Performance | Performance data |
| `GET/POST/PUT` | `/api/fms/coa[/:code]` | Finances | Chart of accounts |
| `GET/POST/PUT` | `/api/fms/budgets[/:id]` | Finances | Budgets |
| `GET/POST` | `/api/fms/transactions[/:id]/*` | Finances | Transactions + audit |
| `GET` | `/api/fms/dashboard` | Finances | FMS dashboard |

### Admin only

| Method | Path | Description |
|---|---|---|
| `GET/POST/PUT/DELETE` | `/api/admin/users[/:id]` | User management |
| `PUT` | `/api/admin/users/:id/roles` | Update user roles |
| `PUT` | `/api/admin/users/:id/password` | Reset password |
| `GET` | `/api/admin/settings` | App settings |
| `GET` | `/api/admin/statistics` | Dashboard statistics |
| `GET/PUT` | `/api/admin/role-permissions[/:role]` | Role permissions |
| `GET/POST/PUT/DELETE` | `/api/admin/roles[/:role]` | Role CRUD |
| `GET` | `/api/admin/cron/status` | Cron scheduler status |
| `POST` | `/api/admin/cron/run` | Trigger nightly cron |
