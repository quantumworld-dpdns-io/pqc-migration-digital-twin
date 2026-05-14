# Phase 2.1 — nginx TLS Termination & CORS

## TLS Configuration

### Local dev (port 443)

nginx listens on both 80 and 443 locally.
Port 80 immediately redirects to 443.
Certificates are mounted from `docker-images/nginx/certs/` (git-ignored).

```nginx
server {
    listen 80;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    ssl_certificate     /etc/nginx/certs/localhost.crt;
    ssl_certificate_key /etc/nginx/certs/localhost.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ...
}
```

### Choreo / production

Choreo terminates TLS at the ingress; nginx receives plain HTTP on port 8080.
The 80→443 redirect block is omitted in the Choreo image.
A single `server { listen 8080; }` block handles all traffic.

The nginx.conf uses a build-arg `ENV` (values: `local` | `choreo`) to select
the right server block via `include /etc/nginx/conf.d/server-${ENV}.conf`.

## CORS Policy

All API responses pass through nginx. CORS is applied here so no individual
microservice needs its own CORS middleware.

Allowed origins come from the env var `CORS_ALLOW_ORIGIN` (injected by Choreo
secrets or docker-compose env). Default: `http://localhost:3000`.

```nginx
map $http_origin $cors_origin {
    default                      "";
    "~^https?://localhost(:\d+)?$"   $http_origin;
    "~^https://.*\.choreoapis\.dev$" $http_origin;
}

add_header Access-Control-Allow-Origin  $cors_origin always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Request-ID" always;
add_header Access-Control-Max-Age       86400 always;

# Preflight
if ($request_method = OPTIONS) {
    return 204;
}
```

## Security Response Headers

Applied in the `http {}` block so every response gets them.

| Header | Value | Reason |
|--------|-------|--------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniff |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Leak control |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restrict APIs |
| `Content-Security-Policy` | See `04-security-headers.md` | XSS |
| `X-XSS-Protection` | `0` | Disable legacy (CSP is sufficient) |

## Upstream Service Names

Within Choreo project, services are reachable by component name over HTTP:

| Variable | Default | Maps to |
|----------|---------|---------|
| `GO_SERVICES_HOST` | `go-services:8080` | gateway & discovery |

The `go-services` name resolves via Kubernetes internal DNS inside Choreo.
Override via environment variable for any non-standard deployment.

## nginx.conf Template Strategy

`nginx.conf` is static (committed). The upstream host is a compile-time constant
that can be overridden via Choreo's env injection using `envsubst`:

Dockerfile injects env at container start via an entrypoint wrapper:
```sh
envsubst '$GO_SERVICES_HOST $CORS_ALLOW_ORIGIN' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf
exec nginx -g "daemon off;"
```
