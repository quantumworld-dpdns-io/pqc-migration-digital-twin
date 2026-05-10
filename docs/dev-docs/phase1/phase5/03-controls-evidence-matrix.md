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
| REL-01A | Dependency outage and recovery fault-injection evidence | `tests/integration/docker_resilience_smoke.sh`; `tests/integration/resilience_summary.sh`; `docs/dev-docs/phase1/phase5/04-fault-injection-playbook.md` | CI/local `resilience.log` + `resilience-summary.json` artifact | Baseline present |
| REL-02 | Graceful frontend fallback indicator when gateway unavailable | `src/web/app/page.tsx`; `src/web/tests/dashboard.smoke.test.mjs` | Test output + screenshot/log of fallback mode | Baseline present |
| REL-03 | API client error/status propagation | `src/web/lib/api.ts`; `src/web/tests/api-client.error-handling.test.mjs` | Node test output for release SHA | Baseline present |
| REL-04 | RED dashboard and alert threshold baseline defined | `docs/dev-docs/phase1/phase5/11-red-dashboard-alert-baseline.md`; `docs/dev-docs/phase1/phase5/04-slo-error-budget-spec.md` | Monitoring-system dashboard export + alert policy export for release SHA | Baseline present |
| REL-05 | SLO/perf governance artifacts are CI/manual validated | `.github/workflows/phase5-slo-governance.yml` | Workflow run URL showing artifact checks + `locustfile.py` syntax validation | Baseline present |
| OPS-01 | Startup/rollback/outage/degraded procedures documented | `docs/dev-docs/phase1/phase5/01-operations-runbooks.md` | Operator sign-off checklist + execution transcript | Baseline present |
| SEC-04 | Secret handling and rotation governance documented | `docs/dev-docs/phase1/phase5/07-secret-handling-and-rotation-runbook.md` | Rotation execution log + approver record | Baseline present |
| DR-01 | DR drill process with measurable RTO/RPO targets | `docs/dev-docs/phase1/phase5/02-dr-drill-template.md` | Completed drill log with timestamps and outcomes | Needs run evidence |
| CMP-01 | Evidence retention and access-control governance documented | `docs/dev-docs/phase1/phase5/08-evidence-retention-and-access-control-policy.md` | Release evidence ACL review + retention metadata log | Baseline present |
| GOV-00 | Change freeze and rollback criteria documented | `docs/dev-docs/phase1/phase5/09-change-freeze-and-rollback-criteria.md` | Freeze decision record + rollback decision trace | Baseline present |
| GOV-01 | Release governance gate references artifacts | `docs/dev-docs/phase1/production-readiness-checklist.md` | Final go/no-go record linking all evidence | Needs run evidence |
| AUD-01 | Audit-event coverage map for discovery/analysis/scoring/proof/release | `docs/dev-docs/phase1/phase5/10-audit-event-coverage-matrix.md` | Per-release evidence links for all matrix rows | Baseline present |

## Known gaps outside this skeleton
- SBOM generation is now wired in CI for repository baseline; remaining gap is full per-image SBOM coverage plus signed provenance attestation.
- External/internal pen-test closure evidence is not yet stored in this repo.
- Production monitoring-system exports/screenshots and executed alert-fire drill evidence are not yet linked.

## Release evidence index (fill per release)
- Release ID:
- Commit SHA:
- CI run URL:
- Smoke report path:
- DR drill log path:
- Security report path:
- Go/no-go approval record path:
