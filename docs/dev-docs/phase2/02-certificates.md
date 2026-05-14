# Phase 2.2 — Local TLS Certificate Generation

## Tool Choice

`openssl` is used (zero extra installs). For a nicer local CA trusted by the
browser, `mkcert` is the recommended alternative.

## What gets generated

```
docker-images/nginx/certs/
  localhost.crt    ← self-signed cert (SAN: localhost, 127.0.0.1)
  localhost.key    ← private key
```

These are git-ignored. Every developer runs the generation script once.

## Script: `scripts/generate-local-certs.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
DEST="docker-images/nginx/certs"
mkdir -p "$DEST"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$DEST/localhost.key" \
  -out    "$DEST/localhost.crt" \
  -days 825 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Certificates written to $DEST/"
echo "Add localhost.crt to your browser/system trust store to avoid warnings."
```

## Browser trust (optional for dev)

### macOS
```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  docker-images/nginx/certs/localhost.crt
```

### Chrome/Firefox
Settings → Privacy → Certificates → Import → select `localhost.crt`
Mark as trusted for "Websites".

## mkcert alternative (zero browser warning)

```bash
brew install mkcert
mkcert -install          # installs local CA once
cd docker-images/nginx/certs
mkcert localhost 127.0.0.1
mv localhost+1.pem     localhost.crt
mv localhost+1-key.pem localhost.key
```

## docker-compose mount

```yaml
nginx:
  volumes:
    - ./docker-images/nginx/certs:/etc/nginx/certs:ro
  ports:
    - "80:80"
    - "443:443"
```

## Choreo

No certificates needed. Choreo terminates TLS at the platform layer.
The `certs/` directory is only used for local compose.
