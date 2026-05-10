# API Connectivity Plan — Nginx Proxy Architecture

**Date:** 2026-05-10  
**Status:** Active

---

## 1. Architecture Overview

```
Internet / UI / Tests
        │
        ▼
  ┌─────────────┐   Public endpoint (Choreo)
  │    nginx    │   port 8080
  │  Component  │   
  └──────┬──────┘
         │  proxies ALL /api/v1/* and /health
         ▼
  ┌──────────────┐   Project-internal only
  │ go-services  │   port 8080 (gateway) + 8081 (discovery)
  └──┬──────┬────┘
     │      │
     ▼      ▼
┌────────┐ ┌──────────┐   Project-internal only
│python- │ │rust-risk │   8082/8084 | 8083
│services│ │          │
└────────┘ └──────────┘
```

**Key rule:** Only nginx has a public Choreo endpoint. All other components are `Project` visibility — they are unreachable from outside Choreo. All traffic (UI, tests, CI) must go through nginx.

---

## 2. Getting the Nginx Public URL

After nginx deploys successfully in Choreo:

1. Go to **Choreo Console** → Project `pqc-migration-digital-twin` → Component `nginx`
2. Click **Deploy** tab → **Development** environment
3. Copy the **Endpoint URL** (format: `https://<hash>.e1-us-east-azure.choreoapis.dev/...`)
4. This is your `GATEWAY_BASE_URL` for all tests, UI config, and API calls

---

## 3. Environment Variable Strategy

All test suites and the UI read a single env var:

| Variable | Local Dev | Choreo Dev | Choreo Prod |
|----------|-----------|------------|-------------|
| `GATEWAY_BASE_URL` | `http://localhost:8080` | Choreo nginx dev URL | Choreo nginx prod URL |

### Set for local development
```bash
# .env (already gitignored)
GATEWAY_BASE_URL=http://localhost:8080
```

### Set for CI (GitHub Actions)
```yaml
# .github/workflows/test.yml
env:
  GATEWAY_BASE_URL: ${{ secrets.CHOREO_NGINX_DEV_URL }}
```

### Set for Choreo components that call the gateway
In Choreo Secrets for each component (if needed):
```
GATEWAY_BASE_URL = https://<nginx-choreo-url>
```

---

## 4. Running Tests Against Each Environment

### Local (docker-compose)
```bash
# Start all services
docker compose -f docker-compose.microservices.yml up -d --build

# Run all test suites
export GATEWAY_BASE_URL=http://localhost:8080

# Integration smoke
bash tests/integration/docker_microservices_smoke.sh

# Robot Framework
robot --variable GATEWAY_BASE_URL:http://localhost:8080 tests/robot/

# Behave (already reads GATEWAY_BASE_URL env var)
behave tests/behave/

# Locust load test
locust -f tests/locust/locustfile.py --host http://localhost:8080
```

### Choreo Dev environment
```bash
export GATEWAY_BASE_URL=https://<choreo-nginx-dev-url>

# Integration smoke (hits Choreo directly)
bash tests/integration/docker_microservices_smoke.sh

# Robot Framework
robot --variable GATEWAY_BASE_URL:$GATEWAY_BASE_URL tests/robot/

# Behave
behave tests/behave/

# Locust
locust -f tests/locust/locustfile.py --host $GATEWAY_BASE_URL
```

---

## 5. UI Connection

The frontend (`src/web/`) must read `GATEWAY_BASE_URL` (or equivalent Next.js env var):

```bash
# src/web/.env.local (gitignored)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080         # local dev

# src/web/.env.production
NEXT_PUBLIC_API_BASE_URL=https://<choreo-nginx-url>   # Choreo prod
```

All API calls from the UI go through:
```
${NEXT_PUBLIC_API_BASE_URL}/api/v1/<route>
```

No direct calls to go-services, python-services, or rust-risk — they are not reachable publicly.

---

## 6. Health Check Endpoints

| Environment | Health URL | Expected |
|-------------|-----------|----------|
| Local | `http://localhost:8080/health` | `{"status":"ok"}` |
| Choreo | `https://<nginx-url>/health` | `{"status":"ok"}` |

The `/health` endpoint on nginx proxies to go-services gateway health. Other services' health is internal only.

---

## 7. Port Summary

| Service | Local port | Choreo accessible? |
|---------|-----------|-------------------|
| nginx | 80 → 8080 | ✅ Public |
| go-services gateway | 8080 | ❌ Internal |
| go-services discovery | 8081 | ❌ Internal |
| python-services analysis | 8082 | ❌ Internal |
| python-services qasm | 8084 | ❌ Internal |
| rust-risk | 8083 | ❌ Internal |

---

## 8. Checklist

- [ ] Confirm nginx Choreo dev URL from console
- [ ] Add `CHOREO_NGINX_DEV_URL` to GitHub Actions secrets
- [ ] Set `NEXT_PUBLIC_API_BASE_URL` in `src/web/.env.local`
- [ ] Run local smoke test to confirm all routes work through nginx
- [ ] Run remote smoke test against Choreo dev URL
- [ ] Add Choreo nginx URL to `docs/api/gateway-openapi.json` servers list
