# Phase 5 Operations Runbooks

Purpose: provide concrete operator procedures for startup, rollback, dependency outage, and degraded-mode operation using the current repository toolchain.

## Scope and prerequisites
- Compose stack: `docker-compose.microservices.yml`
- Primary smoke validation: `tests/integration/docker_microservices_smoke.sh`
- Local command wrappers: `make docker-up`, `make docker-down`, `make docker-smoke`, `make test`, `make contracts`
- CI reference: `.github/workflows/ci.yml` (jobs: `scripts-validation`, `lint`, `test`, `contracts`, `integration-docker`)

## Runbook A: Startup

### Trigger
- New environment boot, planned restart, or post-maintenance start.

### Steps
1. Validate local cert script safety check.
- `bash scripts/validate-local-certs-script.sh`
2. Start services.
- `make docker-up`
3. Wait for ingress health.
- `curl -fsS http://localhost:8080/health`
4. Execute full API smoke.
- `make docker-smoke`
5. Execute baseline quality gates.
- `make lint`
- `make test`
- `make contracts`

### Success criteria
- `/health` returns `200`.
- Smoke script prints `Smoke test passed`.
- `lint/test/contracts` complete without failures.

### Evidence to retain
- Terminal output capture for each command.
- Commit SHA and timestamp.

## Runbook B: Rollback

### Trigger
- Failed deploy, failed smoke tests, or error-rate spike after release.

### Steps
1. Freeze further changes to the affected environment.
2. Identify last known good commit SHA.
3. Check out known good SHA in deployment workspace.
- `git checkout <known-good-sha>`
4. Rebuild and restart stack.
- `make docker-down`
- `make docker-up`
5. Re-run smoke and contracts.
- `make docker-smoke`
- `make contracts`
6. If rollback is successful, open incident follow-up and record bad SHA vs restored SHA.

### Success criteria
- Smoke passes on restored SHA.
- No regression in contract tests.

### Evidence to retain
- Restored SHA and replaced SHA.
- Smoke/contracts output after rollback.

## Runbook C: Dependency Outage

### Trigger
- One downstream service becomes unreachable (e.g., discovery/python/rust/qasm via gateway).

### Steps
1. Confirm blast radius at gateway.
- Probe endpoints through ingress:
  - `POST /api/v1/discovery`
  - `GET /api/v1/assets`
  - `POST /api/v1/risk`
  - `POST /api/v1/risk/backlog`
  - `POST /api/v1/proof`
  - `POST /api/v1/qasm`
2. Identify failing dependency from container logs.
- `docker compose -f docker-compose.microservices.yml logs --tail=200`
3. Restart only failed dependency container first.
- `docker compose -f docker-compose.microservices.yml up -d <service-name>`
4. Re-run targeted endpoint probe, then full smoke.
- `make docker-smoke`
5. If still failing, move to degraded-mode runbook and open incident communication.

### Success criteria
- Impacted endpoint recovers or explicit degraded mode is activated.

### Evidence to retain
- Logs showing outage and recovery attempt.
- Timeline of endpoint status transitions.

## Runbook D: Degraded-Mode Operation

### Trigger
- Dependency remains unavailable beyond restart attempts.

### Behavior contract for this repo
- Keep ingress and healthy services up.
- Return explicit non-2xx for impacted API paths.
- Preserve successful behavior for unaffected endpoints.
- Frontend should visibly indicate fallback mode when gateway data is unavailable (`src/web/app/page.tsx`).

### Steps
1. Confirm which API paths are degraded (per endpoint probe in outage runbook).
2. Keep stack running for unaffected services; do not force full shutdown.
3. Validate UI fallback indicator.
- In dashboard, verify `Data mode: Fallback dataset` appears when gateway access fails.
4. Communicate degraded scope:
- impacted endpoints
- expected user-visible behavior
- next update time
5. Recover dependency and return to normal mode; rerun `make docker-smoke`.

### Success criteria
- Unaffected endpoints remain available.
- Impacted endpoints fail fast and clearly.
- UI fallback mode is observable when backend is unavailable.

### Evidence to retain
- Endpoint-by-endpoint status table during degraded window.
- Screenshot or log proving fallback indicator state.

## Change-control hooks
- Change freeze and go/no-go artifacts must reference this file.
- Every incident/drill should attach outputs plus command transcript snippets.
