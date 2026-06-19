# Choreo Deployment Guide (console.choreo.dev)

How to build, deploy, connect, and troubleshoot the PQC Migration Digital Twin on
[WSO2 Choreo](https://console.choreo.dev). Read this before touching the console.

---

## 1. Architecture

The system runs as **4 Docker components**, each built from a subfolder of
`docker-images/` with its own `.choreo/component.yaml`:

| Component        | Dir (`docker-images/`) | Visibility | Ports        | Role                                   |
|------------------|------------------------|------------|--------------|----------------------------------------|
| **nginx**        | `nginx/`               | **Public** | 8080         | Public entry point; reverse-proxy → go-services |
| **go-services**  | `go-services/`         | Project    | 8080, 8081   | API gateway (8080) + discovery (8081)  |
| **python-services** | `python-services/`  | Project    | 8082, 8084   | Analysis / HNDL scorer (8082) + QASM (8084) |
| **rust-risk**    | `rust-risk/`           | Project    | 8083         | Risk engine / ZK-proof                 |

**Traffic flow:** `Internet → nginx (Public) → go-services (gateway) → python-services / rust-risk`.

> Only **nginx** is `networkVisibilities: Public`, so it is the **only component with a
> public invoke URL** in the console. go/python/rust are `Project` visibility and are
> reachable *only* from inside the project (by their service DNS names). This is by
> design — if you only see a connection/URL for nginx, that is correct, not a bug.

---

## 2. One-time component setup

For **each** of the four components (do nginx last so its backend exists):

1. **Console → your Project → + Create → Service** (Component type: *Service*).
2. **Source:** connect this GitHub repo, branch `main`.
3. **Build preset:** *Dockerfile*.
4. **Component (context) directory:** the matching folder — must be exactly:
   - `docker-images/nginx`
   - `docker-images/go-services`
   - `docker-images/python-services`
   - `docker-images/rust-risk`
5. **Dockerfile path:** `Dockerfile` (relative to the directory above).
6. Choreo reads `.choreo/component.yaml` for the endpoints (ports + visibility) — no
   manual port entry needed.

---

## 3. Build & deploy each component

1. Component → **Build** tab → **Build Latest** (builds the `main` HEAD commit).
2. Wait for the build to go green, then **Deploy** tab → **Deploy** to the target
   environment (Development first, then Production via Promote).
3. Confirm the pod reaches **Ready** (Deploy → Runtime / Observability).

**Order matters:** deploy `python-services` and `rust-risk` first, then `go-services`,
then `nginx`. (nginx now tolerates a missing backend — see §6 — but deploying in order
avoids transient 502s.)

---

## 4. Connections / environment variables

Internal components talk to each other by their **project-internal service DNS names**.
Set these in **each component → DevOps → Configs & Secrets → + Create → Environment Variable**:

### go-services
| Key               | Value                            |
|-------------------|----------------------------------|
| `PYTHON_BASE_URL` | `http://python-services:8082`    |
| `RUST_BASE_URL`   | `http://rust-risk:8083`          |
| `QASM_BASE_URL`   | `http://python-services:8084`    |

### nginx
| Key                | Value               | Notes                                            |
|--------------------|---------------------|--------------------------------------------------|
| `GO_SERVICES_HOST` | `go-services:8080`  | Optional — this is the entrypoint default. Accepts `host:port` or a full `http(s)://…` URL (the entrypoint strips the scheme/path). |
| `NGINX_ENV`        | `choreo`            | Optional — defaults to `choreo`. Use `local` only for local TLS dev. |
| `CORS_ALLOW_ORIGIN`| your frontend origin| Optional extra CORS origin (localhost, `*.choreoapis.dev`, and `pqc-digital-twin.dennisleehappy.org` are already allowed). |

> **Alternative to env vars:** use **Console → Architecture Diagram → + Create** to draw
> a connection (e.g. `nginx → go-services`). Choreo then injects the connection's host
> as the env var. If you codify it in `component.yaml`, copy the generated `resourceRef`
> from the UI.

---

## 5. Auto build & deploy (CD)

A `git push` to `main` only redeploys if **Auto Deploy is enabled per component**:

- Component → **Deploy** (or **Settings → Build**) → enable **Auto Deploy on commit**.
- Do this for **all four** components, otherwise some redeploy on push and others don't
  (the "components not stable for auto build/deploy" symptom).
- If a component's Auto Deploy is **off**, a push will not rebuild it — you must click
  **Build Latest → Deploy** manually.

GitHub Actions CI (`.github/workflows/ci.yml`) lints/tests on push & PR; it does **not**
deploy. Choreo's own build pipeline is what deploys.

---

## 6. Why nginx must not resolve the backend at startup (important)

The nginx component resolves the Go backend **lazily at request time**, never at startup:

- `nginx.conf.template` declares `resolver ${RESOLVER}` (cluster DNS, read from
  `/etc/resolv.conf` by `entrypoint.sh`) plus `map $host $go_backend { default "${GO_SERVICES_HOST}"; }`.
- `locations.conf` uses `proxy_pass http://$go_backend$request_uri;`.

**Do NOT** reintroduce an `upstream { server ...; }` block or a literal hostname in
`proxy_pass`. Those force DNS resolution during `nginx -t` at startup; if `go-services`
is not deployed/connected the name fails to resolve, the config test fails,
`entrypoint.sh` exits 1, and the pod enters **CrashLoopBackOff**
(`Back-off restarting failed container` / `containers with unready status`).

With lazy resolution, nginx boots and `/health` (served by nginx itself, no backend
dependency) passes the readiness probe even when backends are absent; proxied routes
return a graceful `502` until the backend is up.

---

## 7. Smoke test the live deployment

Public base URL (Development env):

```
BASE="https://baedb35c-04cc-4166-887d-a16b2b56924b-dev.e1-eu-north-azure.choreoapis.dev/pqc-migration-digital-twi/nginx/v1.0"
```

No auth header is required for these endpoints.

```bash
# nginx health (no backend needed) — must be 200 even if go-services is down
curl -fsS "$BASE/health"

# gateway health (nginx → go-services) — needs go-services deployed
curl -fsS "$BASE/health/gateway"

# Discovery scan
curl -fsS -X POST "$BASE/api/v1/discovery" \
  -H 'content-type: application/json' \
  -d '{"address":"example.com","port":443}'

# Asset list
curl -fsS "$BASE/api/v1/assets"

# Risk score (→ rust-risk)
curl -fsS -X POST "$BASE/api/v1/risk" \
  -H 'content-type: application/json' \
  -d '{"total_assets":100,"quantum_vulnerable_assets":40}'

# ZK proof
curl -fsS -X POST "$BASE/api/v1/proof" \
  -H 'content-type: application/json' \
  -d '{"credit_score":720,"debt_to_income_bps":3500,"late_payments":1,"existing_loans":2}'

# QASM circuit
curl -fsS -X POST "$BASE/api/v1/qasm" -H 'content-type: application/json' -d '{}'
```

Or run the bundled smoke script:

```bash
GATEWAY_BASE_URL="$BASE" bash tests/integration/docker_microservices_smoke.sh
```

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| nginx `CrashLoopBackOff`, `containers with unready status` | `upstream{}`/literal hostname forces startup DNS resolution; backend not deployed | Use lazy resolution (§6); ensure `nginx.conf.template`/`locations.conf` use `$go_backend` |
| `/health` 200 but `/api/...` returns 502 | go-services not deployed or `GO_SERVICES_HOST` wrong | Deploy go-services; verify `GO_SERVICES_HOST=go-services:8080` |
| go-services up but risk/qasm fail | missing `PYTHON_BASE_URL`/`RUST_BASE_URL`/`QASM_BASE_URL` | Add the env vars in §4 and redeploy |
| Only nginx has a public URL | go/python/rust are `Project` visibility | Expected — reach them through nginx |
| Push didn't redeploy a component | Auto Deploy disabled for it | Enable Auto Deploy (§5) or Build → Deploy manually |
| `curl` returns empty / `HTTP 000` on a path while TLS connects | nginx pod down / mid-redeploy | Wait for pod Ready; check Deploy → Runtime logs |

---

*Last updated: 2026-06-19. Related: `docs/dev-docs/phase1/chore-deploy.md`.*
