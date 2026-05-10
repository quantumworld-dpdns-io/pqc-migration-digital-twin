# Phase 5 Production Readiness Checklist

Use this checklist as the GA gate for **Phase 5: Hardening + Production Readiness**.
Status legend (updated 2026-05-10): `[done]` = directly evidenced in repo artifacts, `[pending]` = not evidenced yet or requires runtime execution evidence, `[external]` = depends on org/process outside repo.

Evidence reconciliation note (2026-05-10): statuses below were revalidated against committed branch artifacts, including runtime-evidence files under `tests/integration/artifacts/`.
Consolidation reconciliation note (2026-05-10): local evidence exists for 4-image build + stack probe health (`tests/integration/artifacts/dr-drill/20260510_145359/{drill.log,summary.json}`) and nginx->gateway `/api/v1/*` route execution (`tests/integration/artifacts/benchmark-10k/20260510_144427/summary.json`); Choreo-environment checks remain external/pending.

## Security
- [ ] `[pending]` Publish and approve service threat model updates for gateway, discovery, python-analysis, rust-risk, qasm services.
- [x] `[done]` Enable dependency/container vulnerability scanning in CI with blocking policy for Critical/High issues. Evidence: `.github/workflows/ci.yml` (`security-readiness` job with Trivy fail-on `HIGH,CRITICAL`).
- [ ] `[pending]` Generate SBOMs for all service images and store signed artifacts with build provenance. Baseline evidence: `.github/workflows/ci.yml` (`security-readiness` job uploads SPDX SBOM artifact); remaining gap is image-wide coverage + signed provenance.
- [ ] `[pending]` Confirm secret handling runtime execution: short-lived credentials enforced and at least one rotation drill executed with evidence.
- [x] `[done]` Secret-handling and rotation runbook with verification checklist is documented. Evidence: `docs/dev-docs/phase1/phase5/07-secret-handling-and-rotation-runbook.md`
- [ ] `[pending]` Validate authN/authZ controls (OIDC/JWT + role checks) on all externally reachable endpoints.
- [ ] `[external]` Complete external/internal pen-test; all findings remediated or risk-accepted in writing.

## Reliability and Operations
- [x] `[done]` Define production runbooks for startup, rollback, dependency outage, and degraded-mode operation. Evidence: `docs/dev-docs/phase1/phase5/01-operations-runbooks.md`
- [x] `[done]` Add structured logs and request IDs for all externally reachable API services. Evidence: `src/go/gateway/server.go`, `src/go/discovery/cmd/discovery/main.go`, `src/python/service.py`, `src/rust/risk-service/src/main.rs`, `src/qasm/examples/service/qasm_service.py`.
- [x] `[done]` Add health/readiness/liveness semantics for all externally reachable API services. Evidence: `GET /live` and `GET /ready` implemented in `src/go/gateway/server.go`, `src/go/discovery/cmd/discovery/main.go`, `src/python/service.py`, `src/rust/risk-service/src/main.rs`, and `src/qasm/examples/service/qasm_service.py`.
- [x] `[done]` Execute baseline fault-injection tests (downstream timeout, partial outage, malformed payload bursts). Evidence: `src/go/gateway/gateway_test.go` (`TestGatewayDownstreamTimeoutReturnsBadGateway`, `TestGatewayMalformedDownstreamPayloadReturnsBadGateway`), `src/go/discovery/cmd/discovery/main_test.go` (`TestScanRejectsMalformedPayloadBurst`), plus `tests/integration/docker_resilience_smoke.sh` and CI job `integration-resilience` in `.github/workflows/ci.yml`.
- [x] `[done]` Verify baseline graceful shutdown and restart behavior. Evidence: `src/go/gateway/gateway_test.go` (`TestGatewayGracefulShutdownAllowsInFlightRequest`), `src/go/discovery/cmd/discovery/main_test.go` (`TestDiscoveryGracefulShutdownAllowsInFlightRequest`), plus restart/recovery assertions in `tests/integration/docker_resilience_smoke.sh` (CI `integration-resilience`).

Observability/RED reconciliation (2026-05-10):
- Implemented baseline observability for API services: request-ID generation/echo plus structured request logs in `src/go/gateway/server.go`, `src/go/discovery/cmd/discovery/main.go`, `src/python/service.py`, `src/rust/risk-service/src/main.rs`, and `src/qasm/examples/service/qasm_service.py`.
- Implemented probe semantics for those services: `/health`, `/live`, and `/ready` (service files above).
- Implemented RED metrics export baseline (`/metrics`) with request/error/latency counters in Go gateway/discovery, Python analysis, Rust risk service, and QASM service.
- Added RED dashboard + alert threshold baseline artifact and validation workflow:
  `docs/dev-docs/phase1/phase5/11-red-dashboard-alert-baseline.md`,
  `.github/workflows/phase5-slo-governance.yml`.
- CI now includes additional verifiable gating/jobs in `.github/workflows/ci.yml`: `security-readiness` (Trivy + SBOM artifact), `dockerfile-build-evidence` (all 4 consolidation Dockerfiles build and publish image-inspect artifacts), and `checkov-dockerfiles` (policy scan gate).
- Remaining RED gap is dashboarding and alerting integration (see SLO and Performance section).

## SLO and Performance
- [x] `[done]` Finalize SLOs for: gateway API, HNDL scoring, risk/proof generation. Evidence: `docs/dev-docs/phase1/phase5/04-slo-error-budget-spec.md` (documented SLO and budget baselines as of 2026-05-10).
- [x] `[done]` Define RED dashboard/alert baseline that maps service metrics to thresholds and escalation actions. Evidence: `docs/dev-docs/phase1/phase5/11-red-dashboard-alert-baseline.md`.
- [x] `[done]` Add CI/manual validation entry for SLO/perf governance artifacts and benchmark harness syntax baseline. Evidence: `.github/workflows/phase5-slo-governance.yml`.
- [ ] `[pending]` Implement RED dashboards in a production monitoring system showing latency (p50/p95/p99), error rate, and throughput per service.
- [ ] `[pending]` Configure and verify live error-budget and burn-rate alerting in production monitoring tooling.
- [x] `[done]` Run load/perf test including a 10k-asset-equivalent scoring scenario. Evidence: `scripts/run-benchmark-10k.sh` with executed artifact `tests/integration/artifacts/benchmark-10k/20260510_144427/summary.json`.
- [ ] `[external]` Capture benchmark evidence sign-off in release governance records (artifact exists; approval/sign-off record still pending). Evidence artifact: `tests/integration/artifacts/benchmark-10k/20260510_144427/summary.json`.

## Disaster Recovery (DR)
- [x] `[done]` Document RTO/RPO targets for each critical data path and service. Evidence: `docs/dev-docs/phase1/phase5/02-dr-drill-template.md`
- [x] `[done]` Create backup/restore procedures for stateful components and artifact storage. Evidence: `docs/dev-docs/phase1/phase5/05-backup-restore-procedure.md` (procedure documented on 2026-05-10).
- [x] `[done]` Run at least one DR drill (service loss path) and record recovery timings. Evidence: `docs/dev-docs/phase1/phase5/12-dr-drill-evidence-2026-05-10.md` and `tests/integration/artifacts/dr-drill/20260510_145359/summary.json`.
- [x] `[done]` Verify dependency failover/fallback procedures and communications path baseline. Evidence: `docs/dev-docs/phase1/phase5/01-operations-runbooks.md`, `docs/dev-docs/phase1/phase5/04-fault-injection-playbook.md`, `tests/integration/docker_resilience_smoke.sh`, and `tests/integration/resilience_summary.sh`.

## Compliance and Auditability
- [x] `[done]` Build controls-to-evidence matrix covering required framework obligations. Evidence: `docs/dev-docs/phase1/phase5/03-controls-evidence-matrix.md`
- [x] `[done]` Document audit-event coverage matrix for discovery, analysis, scoring, proof, and release actions. Evidence: `docs/dev-docs/phase1/phase5/10-audit-event-coverage-matrix.md`
- [x] `[done]` Define evidence retention and access-control policy for audit artifacts with verification checklist. Evidence: `docs/dev-docs/phase1/phase5/08-evidence-retention-and-access-control-policy.md`
- [ ] `[pending]` Produce release evidence pack (test reports, security reports, DR report, approvals).

## Release Governance
- [x] `[done]` Establish change freeze window and rollback criteria governance document. Evidence: `docs/dev-docs/phase1/phase5/09-change-freeze-and-rollback-criteria.md`
- [ ] `[external]` Complete on-call readiness: rota, escalation matrix, incident commander coverage.
- [ ] `[external]` Run incident response exercise and document lessons + action closure owners.
- [ ] `[external]` Conduct final go/no-go review with Engineering, Security, SRE/Ops, and Product sign-off.
- [ ] `[external]` Tag release and archive all GA approval records.

## Definition of Done (Phase 5)
All checklist sections are complete, evidence is linked in the release record, and approvers sign off with no unresolved Critical risks.
