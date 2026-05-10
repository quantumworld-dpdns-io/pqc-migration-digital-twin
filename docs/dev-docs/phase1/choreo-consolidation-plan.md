# Choreo Consolidation Plan — 4-Component Architecture

**Date:** 2026-05-10  
**Status:** In Progress (reconciled to repo evidence on 2026-05-10)  
**Reason:** Choreo free tier limits deployments to 4 components maximum.

---

## 1. Problem Statement

The original architecture had 5 service containers:
| Container | Port | Role |
|-----------|------|------|
| go-gateway | 8080 | API gateway & request routing |
| go-discovery | 8081 | PQC asset scanner |
| python-analysis | 8082 | HNDL scoring & QASM workflow runner |
| qasm-examples | 8084 | QASM file server |
| rust-risk | 8083 | ZK-proof risk engine |

5 components exceeds Choreo's 4-component quota.

---

## 2. Consolidation Strategy

Merge to exactly **4 Choreo components** by combining closely-related services:

```
[ Client ]
    │
    ▼
[ nginx :8080 ]          ← Component 1: Reverse proxy / entry point
    │
    ├──────────────────────────────────────┐
    ▼                                      ▼
[ go-services :8080/:8081 ]      [ python-services :8082/:8084 ]
  (gateway + discovery)            (analysis + qasm-examples)
  Component 2                      Component 3
    │
    ▼
[ rust-risk :8083 ]               ← Component 4: ZK-proof engine
```

### Merge Rationale

| Merged Unit | Services Combined | Why |
|-------------|-------------------|-----|
| **go-services** | go-gateway + go-discovery | Same language, tightly coupled — gateway proxies all `/api/v1/discovery` and `/api/v1/assets` calls directly to discovery. Collocating eliminates a network hop. |
| **python-services** | python-analysis + qasm-examples | Same language/runtime, share the same `src/qasm/examples/` QASM files on disk. No cross-service calls between them (gateway routes to each by path). |
| **rust-risk** | rust-risk (unchanged) | Isolated Rust crate, no natural merge candidate. Stays as-is. |
| **nginx** | new | Choreo exposes one public port per component. Nginx becomes the single ingress, enforcing routing and providing a future load-balancing point. |

---

## 3. File Layout

### New Dockerfiles (`docker-images/`)
```
docker-images/
├── nginx/
│   ├── Dockerfile          ← nginx:alpine, non-root UID 10014, port 8080
│   └── nginx.conf          ← proxies all traffic to go-services:8080
├── go-services/
│   ├── Dockerfile          ← 2-stage build: gateway + discovery → alpine runtime
│   └── start.sh            ← backgrounds discovery, foregrounds gateway
├── python-services/
│   ├── Dockerfile          ← python:3.12-slim, both services + qasm files
│   └── start.sh            ← backgrounds qasm_service.py, foregrounds service.py
└── rust-risk/
    └── Dockerfile          ← identical to src/rust/Dockerfile, centralised copy
```

### Compose Files
| File | Purpose |
|------|---------|
| `docker-compose.microservices.yml` | Local dev — includes local `postgres:15-alpine` |
| `docker-compose.microservices-chore-dev.yml` | Choreo simulation — no local postgres, uses AlwaysData |

---

## 4. Database

**Provider:** AlwaysData  
**Host:** `postgresql-dennislee928.alwaysdata.net`  
**Database:** `dennislee928_postgres`  
**User:** `dennislee928`  
**SSL:** required (`sslmode=require`)  
**PostgreSQL version:** 17  

Connection string template:
```
postgres://dennislee928:${DB_PASSWORD}@postgresql-dennislee928.alwaysdata.net:5432/dennislee928_postgres?sslmode=require
```

**Local dev** uses a local `postgres:15-alpine` container for faster iteration without exposing credentials.

---

## 5. Environment Variable Map

### go-services
| Variable | Local Value | Choreo Value |
|----------|-------------|--------------|
| `DISCOVERY_BASE_URL` | `http://localhost:8081` | `http://localhost:8081` (same container) |
| `PYTHON_BASE_URL` | `http://python-services:8082` | `http://python-services:8082` |
| `RUST_BASE_URL` | `http://rust-risk:8083` | `http://rust-risk:8083` |
| `QASM_BASE_URL` | `http://python-services:8084` | `http://python-services:8084` |
| `DATABASE_URL` | `postgres://postgres:postgres@postgres:5432/pqc_digital_twin?sslmode=disable` | Choreo Secret → AlwaysData URL |

### python-services / rust-risk
| Variable | Local Value | Choreo Value |
|----------|-------------|--------------|
| `DATABASE_URL` | local postgres URL | Choreo Secret → AlwaysData URL |

---

## 6. Port Map

| Component | Internal Port(s) | External (local dev) | External (Choreo) |
|-----------|-----------------|----------------------|-------------------|
| nginx | 8080 | 80 → 8080 | Choreo public endpoint |
| go-services | 8080, 8081 | 8080, 8081 | internal only |
| python-services | 8082, 8084 | 8082, 8084 | internal only |
| rust-risk | 8083 | 8083 | internal only |

---

## 7. Choreo Deployment Steps

1. **Build & push images** to your container registry (e.g., GitHub Container Registry or Docker Hub):
   ```sh
   docker build -t ghcr.io/<org>/nginx:latest         "docker-images/nginx/"
   docker build -f "docker-images/go-services/Dockerfile"     -t ghcr.io/<org>/go-services:latest .
   docker build -f "docker-images/python-services/Dockerfile" -t ghcr.io/<org>/python-services:latest .
   docker build -f "docker-images/rust-risk/Dockerfile"       -t ghcr.io/<org>/rust-risk:latest .
   ```

2. **Create 4 Choreo components**, one per image:
   - Type: `Service` for each
   - Port: match the `EXPOSE` value in each Dockerfile

3. **Add Choreo Secrets** on each component:
   ```
   DATABASE_URL = postgres://dennislee928:<password>@postgresql-dennislee928.alwaysdata.net:5432/dennislee928_postgres?sslmode=require
   ```
   For go-services, also add:
   ```
   PYTHON_BASE_URL  = http://<choreo-endpoint-for-python-services>
   RUST_BASE_URL    = http://<choreo-endpoint-for-rust-risk>
   QASM_BASE_URL    = http://<choreo-endpoint-for-python-services>:8084
   ```

4. **Set nginx upstream hostnames** via env vars (see `nginx.conf` — reads `GO_SERVICES_HOST`, `PYTHON_SERVICES_HOST`, `RUST_RISK_HOST`).

5. **Expose only nginx** component publicly. Keep go-services, python-services, rust-risk as internal.

---

## 8. Security Compliance (CKV_DOCKER_3)

All 4 Dockerfiles include a non-root user with UID **10014** and an explicit `USER 10014` instruction, satisfying Choreo's Checkov scan requirement.

---

## 9. Checklist

Status legend: `[done]` = evidenced in repo, `[pending]` = not yet evidenced in repo, `[external]` = requires Choreo/ops execution.

- [x] `[done]` All 4 Dockerfiles build successfully locally. Evidence (2026-05-10): `tests/integration/artifacts/dr-drill/20260510_145359/drill.log` (compose build output for `nginx`, `go-services`, `python-services`, `rust-risk`).
- [x] `[done]` `docker-compose.microservices.yml` stack starts and all healthchecks pass. Evidence (2026-05-10): `tests/integration/artifacts/dr-drill/20260510_145359/summary.json` (`baseline_probe_200: true`, `smoke_pass: true`).
- [ ] `[pending]` `docker-compose.microservices-chore-dev.yml` validates against Choreo.
- [ ] `[external]` AlwaysData `DATABASE_URL` added as Choreo Secret on each component.
- [ ] `[external]` nginx upstream env vars set in Choreo to point at internal service endpoints.
- [ ] `[pending]` Checkov scan passes (0 failures) on all 4 Dockerfiles. Current repo evidence is CI gating presence only (`.github/workflows/ci.yml` job `checkov-dockerfiles`), not a local run artifact.
- [ ] `[external]` `/health` endpoint reachable via nginx public URL.
- [x] `[done]` All `/api/v1/` routes verified end-to-end through nginx → gateway (local). Evidence (2026-05-10): `tests/integration/artifacts/benchmark-10k/20260510_144427/summary.json` per-endpoint results for `/api/v1/assets`, `/api/v1/discovery`, `/api/v1/risk`, `/api/v1/risk/backlog`, `/api/v1/proof`, `/api/v1/qasm`.

## 10. Verified Repo Evidence Snapshot (2026-05-10)

- `[done]` nginx runtime split by environment (`NGINX_ENV=local|choreo`) with `server-local.conf` and `server-choreo.conf`.
- `[done]` local certificate automation and validator script exist:
  `scripts/generate-local-certs.sh` and `scripts/validate-local-certs-script.sh`.
- `[done]` CI has script validation job (`.github/workflows/ci.yml`) and `make lint` invokes the script validator.
- `[done]` local stack/runtime evidence exists for build + probe health + API-path execution:
  `tests/integration/artifacts/dr-drill/20260510_145359/{drill.log,summary.json}` and
  `tests/integration/artifacts/benchmark-10k/20260510_144427/summary.json`.
