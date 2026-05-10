# Phase 5 Release Evidence Pack Template

Purpose: standardize release-go/no-go evidence for this repository using links to concrete artifacts.

## Release metadata
- Release ID:
- Target environment:
- Commit SHA:
- Release owner:
- Reviewer/approver:
- Planned release date:

## Required evidence checklist

| Area | Required artifact | Link / path | Status |
|---|---|---|---|
| CI quality gates | Green CI run covering `scripts-validation`, `lint`, `test`, `contracts`, `security-readiness`, `dockerfile-build-evidence`, `checkov-dockerfiles`, `integration-docker`, `integration-resilience` |  | Pending |
| API smoke | `tests/integration/docker_microservices_smoke.sh` output for release SHA |  | Pending |
| Resilience smoke | `tests/integration/docker_resilience_smoke.sh` output (fault-injection + recovery) |  | Pending |
| Security scan | Trivy results from `security-readiness` job |  | Pending |
| SBOM | `phase5-sbom-spdx-json` artifact from CI |  | Pending |
| Secret rotation governance | Completed verification checklist from `07-secret-handling-and-rotation-runbook.md` |  | Pending |
| Contract validation | `tests/contracts/test_repo_contract_smoke.py` CI output |  | Pending |
| SLO/budget review | Snapshot vs `04-slo-error-budget-spec.md` with budget state (`Healthy/At risk/Critical/Exhausted`) |  | Pending |
| Backup/restore readiness | Last successful drill/log per `05-backup-restore-procedure.md` |  | Pending |
| DR evidence | Completed `02-dr-drill-template.md` entry with RTO/RPO results |  | Pending |
| Controls mapping | Updated `03-controls-evidence-matrix.md` release evidence index |  | Pending |
| Evidence retention/access review | Completed checklist from `08-evidence-retention-and-access-control-policy.md` |  | Pending |
| Freeze/governance decision | Decision log from `09-change-freeze-and-rollback-criteria.md` |  | Pending |
| Audit-event coverage closure | Release links appended to `10-audit-event-coverage-matrix.md` partial rows |  | Pending |

## Risk exceptions (if any)
| Exception | Justification | Owner | Expiry date | Approved by |
|---|---|---|---|---|
|  |  |  |  |  |

## Go/No-Go decision
- Decision: `Go` / `No-Go`
- Decision timestamp:
- Decision maker(s):
- Conditions (if Go with conditions):

## Post-release verification
- Health check link/output:
- Key endpoint probes:
- Incident/issues opened (if any):

## Archive location
- Evidence bundle folder:
- Permanent record link:
