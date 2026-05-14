# Phase 5 Audit-Event Coverage Matrix

Purpose: map key operational events (discovery, analysis, scoring, proof, release) to current evidence points and known gaps.

Status legend:
- `Evidenced`: directly traceable via current repo artifacts.
- `Partial`: baseline exists but run-time/archive evidence must be attached per release.
- `Gap`: no sufficient evidence path yet.

| Domain | Event | Current evidence point(s) | Status | Gap / follow-up |
|---|---|---|---|---|
| Discovery | Inventory scan request processed | `src/go/discovery/cmd/discovery/main.go` structured logs + request-id; tests in `src/go/discovery/cmd/discovery/main_test.go` | Evidenced | Attach release run log sample |
| Analysis | HNDL scoring/backlog processed | `src/python/service.py` request-id/logging/metrics; tests in `src/python/tests` | Evidenced | Attach release run log sample |
| Scoring | Risk scoring call and response | `src/go/gateway/server.go`; `src/rust/risk-service/src/main.rs`; gateway/risk tests | Evidenced | Attach release run log sample |
| Proof | QASM execution/proof-path request | `src/qasm/examples/service/qasm_service.py` logs/metrics; unit tests | Partial | Full proof artifact lifecycle/audit registry not complete |
| Reliability | Downstream outage + recovery | `tests/integration/docker_resilience_smoke.sh`; `tests/integration/resilience_summary.sh`; CI `integration-resilience` | Evidenced | Archive per-release resilience artifacts |
| Release | Security policy gates | `.github/workflows/ci.yml` jobs: `security-readiness`, `checkov-dockerfiles`, `dockerfile-build-evidence` | Evidenced | Keep links to immutable CI run IDs |
| Release | Go/no-go decision + approvals | `06-release-evidence-pack-template.md` | Partial | Populate per release with approver records |
| Compliance | Evidence retention/access enforcement | `08-evidence-retention-and-access-control-policy.md` | Partial | Validate ACL + retention metadata each release |
| Secrets | Rotation execution and validation | `07-secret-handling-and-rotation-runbook.md` | Partial | Attach executed rotation records |

## Usage notes
- Use this matrix with `03-controls-evidence-matrix.md` for release audits.
- For each release, add concrete artifact links to close `Partial` rows where execution evidence is required.
