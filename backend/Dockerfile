# Stage 1: Build the Go binary
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/api

# Stage 2: Production runtime with Chromium & Khmer fonts
FROM alpine:latest

# Install Chromium and Khmer font packages
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

# Copy binary
COPY --from=builder /app/server .

# Copy Khmer fonts for PDF rendering
COPY --from=builder /app/fonts ./fonts

EXPOSE 8080
CMD ["./server"]
