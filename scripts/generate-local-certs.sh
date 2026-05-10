#!/usr/bin/env bash
set -euo pipefail

DEST="docker-images/nginx/certs"
mkdir -p "$DEST"

if command -v mkcert >/dev/null 2>&1; then
  echo "Using mkcert..."
  mkcert -install 2>/dev/null || true
  mkcert -key-file "$DEST/localhost.key" -cert-file "$DEST/localhost.crt" \
    localhost 127.0.0.1 ::1
else
  echo "mkcert not found, using openssl (browser will show warning)..."
  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "$DEST/localhost.key" \
    -out    "$DEST/localhost.crt" \
    -days 825 \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
  echo ""
  echo "To trust on macOS:"
  echo "  sudo security add-trusted-cert -d -r trustRoot \\"
  echo "    -k /Library/Keychains/System.keychain \\"
  echo "    $DEST/localhost.crt"
fi

echo ""
echo "Certificates written to $DEST/"
