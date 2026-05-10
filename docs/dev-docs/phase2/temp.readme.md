---
  Plans (docs/dev-docs/phase2/):
  - 00-overview.md — architecture diagram, deliverable table, env comparison
  - 01-nginx-tls-cors.md — TLS config, CORS map, security headers, envsubst strategy
  - 02-certificates.md — mkcert/openssl script, browser trust instructions
  - 03-frontend-api.md — API client design, env var strategy, graceful degradation
  - 04-security-headers.md — two-layer header strategy, full CSP policy, checklist

  nginx (complete rewrite):
  - nginx.conf.template — TLS (443) + plain HTTP (8080) dual-server block, CORS map, all security headers, ${GO_SERVICES_HOST} / ${CORS_ALLOW_ORIGIN} substitution
  - locations.conf — shared proxy blocks (included by both server blocks)
  - entrypoint.sh — runs envsubst at container start then execs nginx
  - Dockerfile — adds gettext (provides envsubst), copies template + entrypoint

  Scripts:
  - scripts/generate-local-certs.sh — uses mkcert if installed, falls back to openssl
  
  Frontend (src/web):
  - lib/api.ts — typed client for all 6 endpoints (getAssets, runDiscovery, getRiskScore, getRiskBacklog, generateProof, getQasm)
  - next.config.mjs — security headers (CSP, X-Frame, etc.), poweredByHeader: false, /api/* rewrite proxy 
  - app/page.tsx — server component fetches live assets + risk score, falls back to static data if gateway unreachable

  Env/config:
  - .env.example — added GO_SERVICES_HOST, CORS_ALLOW_ORIGIN, NEXT_PUBLIC_GATEWAY_URL, GATEWAY_URL
  - .gitignore — docker-images/nginx/certs/ excluded
  
  To use locally:
  bash scripts/generate-local-certs.sh   # generate certs once
  cp .env.example .env                   # fill in values
  docker compose -f docker-compose.microservices.yml up -d
  # then visit https://localhost (nginx TLS) or http://localhost:3000 (Next.js dev)