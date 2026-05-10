# Phase 5 Controls-to-Evidence Matrix (Skeleton)

Purpose: map production-readiness controls to concrete evidence artifacts already present in this repository. Add release-specific evidence links per execution cycle.

## Usage
- `Baseline artifact`: stable repo path that demonstrates control implementation intent.
- `Release evidence`: run-specific artifact (logs, reports, screenshots, approvals) captured per release.
- `Status`: `Baseline present`, `Needs run evidence`, or `Gap`.

| Control ID | Control objective | Baseline artifact (repo) | Release evidence to attach | Status |
|---|---|---|---|---|
| SEC-01 | API contract integrity across services | `docs/api/gateway-openapi.json`; `tests/contracts/test_repo_contract_smoke.py`; `tests/doctest/repo_contract_doctest.py` | CI run URL for `contracts` job + output bundle | Baseline present |
| SEC-02 | CI quality gates before integration smoke | `.github/workflows/ci.yml` (`scripts-validation`, `lint`, `test`, `contracts`, `integration-docker`) | Release CI run URL showing all required jobs green | Baseline present |
| SEC-03 | Local TLS cert generation script validation | `scripts/generate-local-certs.sh`; `scripts/validate-local-certs-script.sh`; `Makefile` (`lint`) | Lint output and CI `scripts-validation` run | Baseline present |
| REL-01 | End-to-end microservice startup and API smoke | `tests/integration/docker_microservices_smoke.sh`; `docker-compose.microservices.yml`; `Makefile` (`docker-smoke`) | Smoke transcript for release SHA | Baseline present |
| REL-02 | Graceful frontend fallback indicator when gateway unavailable | `src/web/app/page.tsx`; `src/web/tests/dashboard.smoke.test.mjs` | Test output + screenshot/log of fallback mode | Baseline present |
| REL-03 | API client error/status propagation | `src/web/lib/api.ts`; `src/web/tests/api-client.error-handling.test.mjs` | Node test output for release SHA | Baseline present |
| OPS-01 | Startup/rollback/outage/degraded procedures documented | `docs/dev-docs/phase1/phase5/01-operations-runbooks.md` | Operator sign-off checklist + execution transcript | Baseline present |
| DR-01 | DR drill process with measurable RTO/RPO targets | `docs/dev-docs/phase1/phase5/02-dr-drill-template.md` | Completed drill log with timestamps and outcomes | Needs run evidence |
| GOV-01 | Release governance gate references artifacts | `docs/dev-docs/phase1/production-readiness-checklist.md` | Final go/no-go record linking all evidence | Needs run evidence |

## Known gaps outside this skeleton
- SBOM generation is now wired in CI for repository baseline; remaining gap is full per-image SBOM coverage plus signed provenance attestation.
- External/internal pen-test closure evidence is not yet stored in this repo.
- Production SLO dashboard and burn-rate alert evidence are not yet linked.

## Release evidence index (fill per release)
- Release ID:
- Commit SHA:
- CI run URL:
- Smoke report path:
- DR drill log path:
- Security report path:
- Go/no-go approval record path:
