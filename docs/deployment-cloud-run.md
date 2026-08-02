# Deploying Cheungprey System to Google Cloud Run

This guide covers deploying the Go backend (with `chromedp` for PDF generation, Chromium + Khmer fonts) to **Google Cloud Run** — a serverless container platform that scales to zero, staying within GCP's free tier.

---

## Prerequisites

- **Google Cloud SDK (`gcloud` CLI)** installed
- A **Google Cloud Project** with billing enabled
- Your Go codebase with `chromedp` configured for `/usr/bin/chromium-browser`

---

## 1. Configure Environment Variables

Cloud Run dynamically assigns a port via the `PORT` environment variable (default `8080`). Your Go server must listen on this:

```go
port := os.Getenv("PORT")
if port == "" {
    port = "8080"
}
log.Printf("Server starting on port %s", port)
http.ListenAndServe(":"+port, router)
```

Ensure `chromedp` finds Chrome at `/usr/bin/chromium-browser` (set by the Dockerfile below).

---

## 2. Production Dockerfile

Multi-stage build: compile Go binary in stage 1, run in Alpine with Chromium and Khmer fonts in stage 2.

Create `Dockerfile` at the project root:

```dockerfile
# Stage 1: Build the Go binary
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/api

# Stage 2: Production runtime with Chromium & Khmer fonts
FROM alpine:latest

# Install Chromium and Khmer fonts
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-khmer

# Required by chromedp
ENV CHROME_BIN=/usr/bin/chromium-browser

WORKDIR /root/
COPY --from=builder /app/server .
COPY --from=builder /app/templates ./templates

EXPOSE 8080
CMD ["./server"]
```

---

## 3. Initialize GCP & Enable APIs

Run once per project:

```bash
# Login to Google Cloud
gcloud auth login

# Set your active project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

---

## 4. Deploy to Cloud Run

Run from your source code directory:

```bash
gcloud run deploy cheungprey-api \
  --source . \
  --region us-central1 \
  --memory 1Gi \
  --cpu 1 \
  --allow-unauthenticated \
  --set-env-vars \
    SUPABASE_URL="https://YOUR_PROJECT.supabase.co",\
    SUPABASE_PUBLISHABLE_KEY="sb_publishable_...",\
    SUPABASE_SECRET_KEY="eyJhbGci...",\
    SUPABASE_JWKS_URL="https://YOUR_PROJECT.supabase.co/auth/v1/.well-known/jwks.json"
```

### Flag Explanation

| Flag | Purpose |
|---|---|
| `--source .` | Auto-builds container via Cloud Build → Artifact Registry |
| `--memory 1Gi` | Minimum for Chromium; prevents OOM crashes during PDF generation |
| `--cpu 1` | One vCPU per request |
| `--allow-unauthenticated` | Public endpoint (your React frontend calls it directly) |
| `--set-env-vars` | Pass Supabase credentials and other config |

---

## 5. Verify Deployment

GCP will output your live URL (e.g. `https://cheungprey-api-xyz-uc.a.run.app`).

```bash
# Health check
curl -I https://cheungprey-api-xyz-uc.a.run.app/health

# Test PDF endpoint
curl -o test.pdf https://cheungprey-api-xyz-uc.a.run.app/reports/performance/ZONE_ID/PERIOD_ID
```

---

## 6. Frontend Configuration

Update your frontend `VITE_API_URL` to point to the Cloud Run URL:

```bash
# .env.production
VITE_API_URL=https://cheungprey-api-xyz-uc.a.run.app
```

---

## Important Cloud Run Settings for chromedp

1. **Memory: at least 1 GiB** — Default 512MB causes Chromium OOM on large HTML
2. **CPU always allocated** — Enable in Cloud Run settings for consistent PDF performance
3. **Concurrency** — Set `max-instances` if needed; each Chrome instance renders one PDF at a time
4. **CORS** — Ensure your Go server sends appropriate CORS headers if called from a different origin

---

## Cold Start Optimization

- Chrome binary is ~200MB; Cloud Run cold starts may take 3-5 seconds
- Set `--min-instances 1` (~$7/month) to eliminate cold starts for production
- For free tier, the first PDF request after idle will have a ~5s delay

---

## Local Testing

```bash
# Build and run locally with Docker
docker build -t cheungprey-api .
docker run -p 8080:8080 --env-file .env cheungprey-api
```
