# Phase 2 Progress Tracker

Last updated: 2026-05-10
Scope: Deliverables listed in `00-overview.md`

## Status Summary

| # | Deliverable | Status | Validated now | Residual follow-ups |
|---|---|---|---|---|
| 1 | `docker-images/nginx/nginx.conf` (CORS + security headers + TLS block) | Partially implemented | File exists, but current `nginx.conf` is HTTP on `:8080` only and does not contain TLS/CORS/security-header layer described in Phase 2 | Align runtime/default config with `nginx.conf.template` design or update overview if template is intended source of truth |
| 2 | `docker-images/nginx/Dockerfile` (copy certs into image for local dev) | In progress | Dockerfile creates `/etc/nginx/certs` but does not copy local cert files into image | Decide mount vs copy strategy; if copy is required, add `COPY certs/` with safe local-dev guardrails |
| 3 | `scripts/generate-local-certs.sh` (mkcert/openssl wrapper) | Done | Script exists, executable, supports mkcert and openssl fallback, outputs `docker-images/nginx/certs/localhost.{crt,key}` | Add a quick CI/lint check for script shell syntax and expected output paths |
| 4 | `src/web/next.config.mjs` (security headers + rewrites) | Done | Security header set present, `poweredByHeader: false`, `/api/:path*` rewrite uses `GATEWAY_URL` | Validate CSP against any new frontend dependencies before release |
| 5 | `src/web/lib/api.ts` (typed API client, 6 endpoints) | Done | Typed client present with 6 endpoint helpers: `getAssets`, `runDiscovery`, `getRiskScore`, `getRiskBacklog`, `generateProof`, `getQasm` | Add integration tests against gateway contract for status/error payload handling |
| 6 | `src/web/app/page.tsx` (live fetch + static fallback) | Done | Server component fetches live assets/risk and falls back to static datasets when gateway/env unavailable | Add explicit UI state badge indicating fallback mode vs live mode |
| 7 | `.env.example` (`NEXT_PUBLIC_GATEWAY_URL`) | Done | `.env.example` includes `NEXT_PUBLIC_GATEWAY_URL` and related gateway/nginx variables | Keep commented Choreo URL example synchronized with current deployed path |

## Execution Notes (Action-Oriented)

- Highest-priority gap is Deliverable 1 consistency (`nginx.conf` vs Phase 2 TLS/CORS/header target behavior).
- Deliverable 2 depends on local certificate packaging decision (image copy vs bind mount).
- Frontend deliverables (4-7) are present and functionally aligned with Phase 2 intent; remaining work is verification hardening.
