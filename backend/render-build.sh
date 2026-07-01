#!/usr/bin/env bash
set -euo pipefail

# Install Chromium for headless PDF generation on Linux (Render).
if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq chromium chromium-sandbox fonts-liberation \
    || apt-get install -y -qq chromium-browser fonts-liberation \
    || true
fi

for bin in /usr/bin/chromium /usr/bin/chromium-browser /usr/bin/google-chrome-stable; do
  if [[ -x "$bin" ]]; then
    export CHROME_PATH="$bin"
    echo "Using Chrome: $CHROME_PATH"
    break
  fi
done

go build -o app ./cmd/api
