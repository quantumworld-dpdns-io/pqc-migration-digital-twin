# Phase 2 — nginx TLS Proxy, Frontend API Integration & Security

## Goal

Connect the Next.js dashboard to live microservice data through a hardened nginx
layer that handles TLS termination, CORS enforcement, and HTTP security headers.

## Architecture

```
                  HTTPS (443 local / Choreo TLS)
Browser ──────────────────────────────────────► nginx
                                                  │
                     ┌────────────────────────────┤
                     │  - TLS termination          │
                     │  - CORS headers             │
                     │  - Security response hdrs   │
                     │  - Rate limiting (phase 3)  │
                     └─────────────┬──────────────┘
                                   │ HTTP (project-internal)
                          ┌────────▼────────┐
                          │   go-services   │ :8080 / :8081
                          └────────┬────────┘
                     ┌─────────────┼─────────────┐
                     ▼             ▼             ▼
             python-services  rust-risk    postgres
               :8082/:8084      :8083
```

**Environments:**

| Env | TLS provider | Certificate |
|-----|-------------|-------------|
| Local dev | nginx (self-signed via mkcert/openssl) | `certs/localhost.{crt,key}` |
| Choreo dev | Choreo platform ingress | auto-managed |
| Choreo prod | Choreo platform ingress | auto-managed |

In Choreo, TLS is terminated at the platform ingress before reaching nginx.
nginx still enforces CORS and security headers for all environments.

## Deliverables

| # | File | What it does |
|---|------|-------------|
| 1 | `docker-images/nginx/nginx.conf` | CORS + security headers + TLS block |
| 2 | `docker-images/nginx/Dockerfile` | copy certs into image for local dev |
| 3 | `scripts/generate-local-certs.sh` | mkcert/openssl wrapper |
| 4 | `src/web/next.config.mjs` | Next.js security headers + rewrites |
| 5 | `src/web/lib/api.ts` | typed API client (all 6 endpoints) |
| 6 | `src/web/app/page.tsx` | fetch live data, graceful static fallback |
| 7 | `.env.example` | `NEXT_PUBLIC_GATEWAY_URL` added |

## Documents in this folder

- `01-nginx-tls-cors.md` — nginx configuration decisions
- `02-certificates.md` — certificate generation for local dev
- `03-frontend-api.md` — API client design and env var strategy
- `04-security-headers.md` — CSP, HSTS, and browser security policies
