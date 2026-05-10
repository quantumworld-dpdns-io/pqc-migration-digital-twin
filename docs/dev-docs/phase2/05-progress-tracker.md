# Phase 2 Progress Tracker

Last updated: 2026-05-10
Scope: Deliverables listed in `00-overview.md`

## Status Summary

| # | Deliverable | Status | Validated now | Residual follow-ups |
|---|---|---|---|---|
| 1 | `docker-images/nginx/nginx.conf` (CORS + security headers + TLS block) | Done | Runtime config is now generated from `nginx.conf.template`; template contains global CORS/security headers and env-selected server include (`server-local.conf` or `server-choreo.conf`) | Keep `nginx.conf` reference file synchronized with template defaults when policy changes |
| 2 | `docker-images/nginx/Dockerfile` (copy certs into image for local dev) | Done | Dockerfile now ships both env server fragments and exposes `80/8080/443`; cert path is prepared and used by local server fragment | Local certificates remain a bind-mount/generated artifact (not committed), document this in runbook if needed |
| 3 | `scripts/generate-local-certs.sh` (mkcert/openssl wrapper) | Done | Script exists, executable, supports mkcert and openssl fallback, outputs `docker-images/nginx/certs/localhost.{crt,key}` | Add a quick CI/lint check for script shell syntax and expected output paths |
| 4 | `src/web/next.config.mjs` (security headers + rewrites) | Done | Security header set present, `poweredByHeader: false`, `/api/:path*` rewrite uses `GATEWAY_URL` | Validate CSP against any new frontend dependencies before release |
| 5 | `src/web/lib/api.ts` (typed API client, 6 endpoints) | Done | Typed client present with 6 endpoint helpers: `getAssets`, `runDiscovery`, `getRiskScore`, `getRiskBacklog`, `generateProof`, `getQasm` | Add integration tests against gateway contract for status/error payload handling |
| 6 | `src/web/app/page.tsx` (live fetch + static fallback) | Done | Server component fetches live assets/risk and falls back to static datasets when gateway/env unavailable | Add explicit UI state badge indicating fallback mode vs live mode |
| 7 | `.env.example` (`NEXT_PUBLIC_GATEWAY_URL`) | Done | `.env.example` includes `NEXT_PUBLIC_GATEWAY_URL` and related gateway/nginx variables | Keep commented Choreo URL example synchronized with current deployed path |

## Execution Notes (Action-Oriented)

- `NGINX_ENV` is now the mode switch (`local` or `choreo`) selected at container startup in `entrypoint.sh`.
- Shared proxy routes stay in `locations.conf`; environment-specific listeners and TLS behavior are isolated in `server-local.conf` / `server-choreo.conf`.
- Frontend worker validated `npm run test` and `npx tsc --noEmit` successfully; lint remains blocked until an ESLint config is initialized for this repo.
