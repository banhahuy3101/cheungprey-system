# Root Dockerfile — delegates to backend/
# Stage 1: Build the Go binary
FROM golang:1.24-alpine AS builder
ENV GOTOOLCHAIN=auto
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/api

# Stage 2: Production runtime with Chromium & Khmer fonts
FROM alpine:latest

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-khmer

ENV CHROME_BIN=/usr/bin/chromium-browser

WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/fonts ./fonts

EXPOSE 8080
CMD ["./server"]
