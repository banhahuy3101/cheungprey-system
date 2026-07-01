# Cheungprey Backend

Go REST API with Supabase integration.

## Prerequisites

- Go 1.26+
- Supabase project (for database, auth, and RLS)

## Setup

Copy the environment file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Get the values from your Supabase dashboard: **Project Settings → API**.

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Anon/public key (RLS-scoped) |
| `SUPABASE_SECRET_KEY` | Service role key (bypasses RLS) |
| `SUPABASE_JWKS_URL` | `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` |

> Never commit the secret key or `.env`.

## Run

```bash
go run ./cmd/api
```

Server starts on port `8080` by default (override via `PORT` env).

## Build

```bash
go build -o bin/api ./cmd/api
./bin/api
```

## Deploy (Render)

Set **Root Directory** to `backend`, then use:

| Setting | Value |
|---|---|
| Build Command | `go build -o app ./cmd/api` |
| Start Command | `./app` |

Or use the repo `render.yaml` Blueprint (Docker image includes Chromium for PDF reports).

Required env vars on Render: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`.
Optional: `CHROME_PATH=/usr/bin/chromium` (set automatically in Docker deploy).

## Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Health check |
| `GET` | `/api/todos` | User JWT | Fetch todos (RLS-scoped) |
| `GET` | `/api/admin/todos` | Secret key | Fetch all todos (bypasses RLS) |
| `GET` | `/api/me` | User JWT | Return verified JWT claims |

## Architecture

```
internal/
├── supabase/        # Supabase integration
│   ├── supabase.go    # Clients struct, NewClients(), FromContext()
│   ├── jwt.go         # JWKS-based JWT verification
│   ├── verify.go      # RS256 signature verification
│   └── middleware.go  # withSupabase-equivalent middleware (4 auth modes)
├── handler/         # HTTP handlers
├── model/           # Data types
└── router/          # Route registration + middleware wiring
```

### Auth modes

The `supabase.Middleware` function supports four auth modes, analogous to `withSupabase` from the JS SDK:

- `AuthModeUser` — verifies JWT via JWKS, injects RLS-scoped client with user's token
- `AuthModePublishable` — uses anon key (rate-limited public access)
- `AuthModeSecret` — uses service role key (bypasses RLS)
- `AuthModeNone` — uses anon key without auth

### Using Supabase in handlers

```go
func MyHandler(w http.ResponseWriter, r *http.Request) {
    clients, ok := supabase.FromContext(r.Context())
    if !ok {
        http.Error(w, "supabase not available", http.StatusInternalServerError)
        return
    }

    // RLS-scoped (uses user's JWT)
    data, _, err := clients.User.From("todos").Select("*", "", false).Execute()

    // Admin (bypasses RLS)
    data, _, err := clients.Admin.From("todos").Select("*", "exact", false).Execute()

    // Access verified JWT claims
    claims, _ := supabase.GetClaims(r.Context())
}
```

### Adding a new route

```go
// router.go
mux.Handle("GET /api/items",
    supabase.Middleware(supabase.MiddlewareOptions{Auth: supabase.AuthModeUser})(
        http.HandlerFunc(h.GetItems),
    ),
)
```
