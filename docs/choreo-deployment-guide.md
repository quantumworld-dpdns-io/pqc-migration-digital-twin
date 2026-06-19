# Choreo Deployment Guide (console.choreo.dev)

How to build, deploy, connect, and troubleshoot the PQC Migration Digital Twin on
[WSO2 Choreo](https://console.choreo.dev). Read this before touching the console.

---

## 0. Recommended: the consolidated single component (`docker-images/app`)

Choreo's connection wizard could not publish/select the project services (the
"Select a Resource" card never rendered even after adding OpenAPI schemas and
Organization visibility), which made same-project service-to-service connections
unusable. To make the whole API function **without any connections**, use the
consolidated component at `docker-images/app`: the Go gateway (public, :8080) runs
the Go discovery, Python analysis/qasm and Rust risk services in the same container
and reaches them over `localhost`.

**Create it in Choreo (one component, no connections, no nginx):**
1. Console → project → **+ Create** → **Service** → connect this repo, branch `main`.
2. Build preset: **Dockerfile**.
3. **Component directory:** `docker-images/app`
4. **Docker context / Project path:** `.` (repository root — required, the build pulls
   all three source trees)
5. **Dockerfile path:** `docker-images/app/Dockerfile`
6. **Build → Deploy.** The `api` endpoint is `Public` (:8080) and gets a public URL.

Verified locally (build context = repo root) **and live in Choreo**: every `/api/v1/*`
route returns 200 with real data. Once this is deployed you can retire the separate
nginx/go/python/rust components. The sections below describe the original multi-component
setup and the connection issue, kept for reference.

**Deployed component:** `backend` (Development). Public URL:
`https://baedb35c-04cc-4166-887d-a16b2b56924b-dev.e1-eu-north-azure.choreoapis.dev/pqc-migration-digital-twi/backend/v1.0`

**Calling it:** the create-endpoint flow enabled API-key/OAuth2 security, so requests need a
key (unlike the old open nginx URL). Get a short-lived test key and pass it as the
`Api-Key` header:
```bash
choreo create test-key --project=pqc-migration-digital-twin-project \
  --component=backend --deployment-track=main --env=Development
# then: curl -H "Api-Key: <token>" "$URL/api/v1/risk" -X POST -d '{"total_assets":100,"quantum_vulnerable_assets":40}'
```
To make it open like the old nginx URL, disable endpoint security in the component's
Settings. Verified live (with key): `/health`, `/api/v1/{assets,discovery,risk,proof,qasm}`
all return 200 with real data.

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

## 4. Connections (REQUIRED for cross-component traffic)

> **Critical — read this.** Components do **not** reach each other by their plain name.
> `http://go-services:8080` / `http://python-services:8082` **do not resolve** — verified
> from inside the cluster: `lookup go-services on 172.19.0.10:53: no such host`. The
> in-cluster Service name has a hash suffix (e.g. nginx is `nginx-527345497.<namespace>`),
> which you must **not** hardcode. The supported way to wire components is a **Connection**:
> Choreo injects the real internal URL as an environment variable at deploy time.

This is the actual cause of "components not deployed / not reachable": all four build and
run, but with no connections nginx can't find go-services (`502`, log:
`go-services could not be resolved (3: Host not found)`), and go-services can't find
python/rust.

### Create the connections

For each consumer→provider pair, **Console → the consumer component → Connections →
+ Create** (or Architecture Diagram → draw the arrow), pick the provider service/endpoint,
then **rename the injected `CHOREO_<conn>_SERVICEURL`** to the env var the consumer code
expects:

| Consumer      | Provider (endpoint)        | Rename injected var to | Consumer expects |
|---------------|----------------------------|------------------------|------------------|
| **nginx**     | go-services (gateway 8080)  | `GO_SERVICES_HOST`     | full URL ok — entrypoint strips scheme/path |
| **go-services** | python-services (8082)    | `PYTHON_BASE_URL`      | `http://…:8082`   |
| **go-services** | rust-risk (8083)          | `RUST_BASE_URL`        | `http://…:8083`   |
| **go-services** | python-services (qasm 8084) | `QASM_BASE_URL`      | `http://…:8084`   |

**This must be done in the Console — the CLI cannot do same-project connections.**
`choreo create connection` only queries the org/public **marketplace** and fails with
`no APIs available in the marketplace`; same-project component-to-component wiring lives in
the **Architecture Diagram**, which the CLI does not expose. (Likewise, `choreo describe
deployment` returns the internal `projectUrl` only for Public components like nginx —
`http://nginx-527345497:8080/` — and "not found" for Project-visibility ones, so you
cannot even read the real hashed Service name from the CLI.) Step by step, per pair:

1. Console → the **project** → **Architecture Diagram** (or consumer component →
   **Connections**) → **+ Create / draw the arrow** from consumer to provider.
2. Choose the **provider** component + endpoint (e.g. go-services / gateway 8080).
3. Visibility **Project**. Create — Choreo generates `CHOREO_<NAME>_SERVICEURL`.
4. In the consumer's **Configs & Secrets** (or the connection's config mapping),
   **rename** that `…_SERVICEURL` to the var the code expects
   (`GO_SERVICES_HOST`, `PYTHON_BASE_URL`, `RUST_BASE_URL`, `QASM_BASE_URL`).
5. **Redeploy the consumer** so the new env var is injected.

After wiring nginx→go-services, the nginx log line
`go-services could not be resolved` disappears and `/api/v1/*` returns 200. Re-verify with
`choreo logs application --component=nginx --env=Development` and the §7 smoke tests.

> To **codify** a connection in `.choreo/component.yaml` (so it survives redeploys), create
> it once in the UI, copy the generated `resourceRef`, and add it under
> `dependencies.connectionReferences` with an `env:` mapping to the target var name.

### Other nginx env vars (optional)
| Key                | Default   | Notes                                            |
|--------------------|-----------|--------------------------------------------------|
| `NGINX_ENV`        | `choreo`  | Use `local` only for local TLS dev.              |
| `CORS_ALLOW_ORIGIN`| localhost | Extra CORS origin (localhost, `*.choreoapis.dev`, `pqc-digital-twin.dennisleehappy.org` already allowed). |

### go-services database (optional)
go-services logs `password authentication failed for user "dennislee928" (continuing
without DB)`. Non-fatal — it runs without persistence. For full functionality set a
correct `DATABASE_URL` (Postgres) via Configs & Secrets, or via a Choreo **database
connection**.

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

**Read-only root filesystem:** Choreo runs the container with a read-only root FS, so
nginx must write only to the writable `/tmp/nginx-runtime`. `nginx.conf.template` sets
`pid /tmp/nginx-runtime/nginx.pid;`, points all `*_temp_path` under `/tmp/nginx-runtime`,
and sends `error_log` → `/dev/stderr`, `access_log` → `/dev/stdout`. Do **not** point
`pid` or temp paths at `/var/run` or `/var/cache` — they fail with
`open() ... failed (30: Read-only file system)`.

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
| nginx `open() "/var/run/nginx.pid" failed (30: Read-only file system)` | pid/temp/log paths on read-only root FS | Point pid + `*_temp_path` to `/tmp/nginx-runtime`, logs to stdout/stderr (§6) |
| `choreo list builds/describe/create build <c>` → `not found` for go/python/rust | component record exists but build track never configured | In console, open the component → configure Build (repo `main`, Dockerfile, context dir `docker-images/<name>`) → Build → Deploy |
| Diagnosing any runtime crash | console screenshots hide container stderr | `choreo logs application --component=<c> --project=<proj> --env=Development --limit=400` |
| `/health` 200 but `/api/...` 502, nginx log `go-services could not be resolved (Host not found)` | **no Connection** nginx→go-services; plain name doesn't resolve | Create connection + map to `GO_SERVICES_HOST` (§4) |
| go-services up but risk/qasm fail | no connections go-services→python/rust; `PYTHON_BASE_URL`/`RUST_BASE_URL`/`QASM_BASE_URL` point at non-resolving names | Create connections (§4) and redeploy go-services |
| go-services `password authentication failed ... (continuing without DB)` | wrong/missing `DATABASE_URL` | Set a correct `DATABASE_URL` or DB connection (§4); non-fatal otherwise |
| Only nginx has a public URL / `choreo describe` works only for nginx | go/python/rust are `Project` visibility | Expected — reach them through nginx; use `choreo logs` to inspect them |
| Push didn't redeploy a component | Auto Deploy disabled for it | Enable Auto Deploy (§5) or Build → Deploy manually |
| `curl` returns empty / `HTTP 000` on a path while TLS connects | nginx pod down / mid-redeploy | Wait for pod Ready; check `choreo logs` |
| prod URL returns `401 Invalid Credentials` | managed prod API needs a key | `choreo create test-key ...` or subscribe; dev URL needs no key |

---

*Last updated: 2026-06-19. Related: `docs/dev-docs/phase1/chore-deploy.md`.*
