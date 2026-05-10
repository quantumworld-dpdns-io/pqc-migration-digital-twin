# Phase 2 Progress Tracker

Last updated: 2026-05-10
Scope: Deliverables listed in `00-overview.md`

Reconciliation note (2026-05-10): in-flight observability/health work is tracked under Phase 5 readiness and does not change Phase 2 deliverable completion unless corresponding code and tests are merged and verifiable in this branch snapshot.

## Status Summary

| # | Deliverable | Status | Validated now | Residual follow-ups |
|---|---|---|---|---|
| 1 | `docker-images/nginx/nginx.conf` (CORS + security headers + TLS block) | Done | Runtime config is generated from `nginx.conf.template`; template has global CORS/security headers and env-selected server include (`server-local.conf` / `server-choreo.conf`) | None (Phase 2 scope complete) |
| 2 | `docker-images/nginx/Dockerfile` (copy certs into image for local dev) | Done | Dockerfile ships both env server fragments and exposes `80/8080/443`; local TLS server uses `/etc/nginx/certs/localhost.{crt,key}` | None (Phase 2 scope complete) |
| 3 | `scripts/generate-local-certs.sh` (mkcert/openssl wrapper) | Done | Script exists, executable, supports mkcert and openssl fallback, outputs `docker-images/nginx/certs/localhost.{crt,key}` | None (Phase 2 scope complete) |
| 4 | `src/web/next.config.mjs` (security headers + rewrites) | Done | Security headers present, `poweredByHeader: false`, `/api/:path*` rewrite uses `GATEWAY_URL` | Phase 3 only: add CSP reporting (`report-uri`/`report-to`) |
| 5 | `src/web/lib/api.ts` (typed API client, 6 endpoints) | Done | Typed client present with 6 endpoint helpers: `getAssets`, `runDiscovery`, `getRiskScore`, `getRiskBacklog`, `generateProof`, `getQasm` | None (Phase 2 scope complete) |
| 6 | `src/web/app/page.tsx` (live fetch + static fallback) | Done | Server component fetches live assets/risk and falls back to static datasets when gateway/env unavailable | None (Phase 2 scope complete) |
| 7 | `.env.example` (`NEXT_PUBLIC_GATEWAY_URL`) | Done | `.env.example` includes `NEXT_PUBLIC_GATEWAY_URL` and related gateway/nginx variables | None (Phase 2 scope complete) |

## External/Phase 3 Pending Only

- `NGINX_ENV` is now the mode switch (`local` or `choreo`) selected at container startup in `entrypoint.sh`.
- Shared proxy routes stay in `locations.conf`; environment-specific listeners and TLS behavior are isolated in `server-local.conf` / `server-choreo.conf`.
- HSTS preload submission is pending production domain finalization and ownership checks (external dependency).
- CSP violation reporting (`report-uri`/`report-to`) is intentionally deferred to Phase 3.
- Cookie hardening flags are pending auth/session cookie introduction (not part of current Phase 2 implementation scope).
