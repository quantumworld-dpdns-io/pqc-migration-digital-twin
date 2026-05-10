# Phase 5 Production Readiness Checklist

Use this checklist as the GA gate for **Phase 5: Hardening + Production Readiness**.
Status legend (updated 2026-05-10): `[done]` = evidenced in repo, `[pending]` = not evidenced yet, `[external]` = depends on org/process outside repo.

## Security
- [ ] `[pending]` Publish and approve service threat model updates for gateway, discovery, python-analysis, rust-risk, qasm services.
- [x] `[done]` Enable dependency/container vulnerability scanning in CI with blocking policy for Critical/High issues. Evidence: `.github/workflows/ci.yml` (`security-readiness` job with Trivy fail-on `HIGH,CRITICAL`).
- [ ] `[pending]` Generate SBOMs for all service images and store signed artifacts with build provenance. Baseline evidence: `.github/workflows/ci.yml` (`security-readiness` job uploads SPDX SBOM artifact); remaining gap is image-wide coverage + signed provenance.
- [ ] `[pending]` Confirm secret handling: no secrets in repo, short-lived credentials, rotation runbook tested.
- [ ] `[pending]` Validate authN/authZ controls (OIDC/JWT + role checks) on all externally reachable endpoints.
- [ ] `[external]` Complete external/internal pen-test; all findings remediated or risk-accepted in writing.

## Reliability and Operations
- [x] `[done]` Define production runbooks for startup, rollback, dependency outage, and degraded-mode operation. Evidence: `docs/dev-docs/phase1/phase5/01-operations-runbooks.md`
- [x] `[done]` Add structured logs and request IDs for all externally reachable API services. Evidence: `src/go/gateway/server.go`, `src/go/discovery/cmd/discovery/main.go`, `src/python/service.py`, `src/rust/risk-service/src/main.rs`, `src/qasm/examples/service/qasm_service.py`.
- [x] `[done]` Add health/readiness/liveness semantics for all externally reachable API services. Evidence: `GET /live` and `GET /ready` implemented in `src/go/gateway/server.go`, `src/go/discovery/cmd/discovery/main.go`, `src/python/service.py`, `src/rust/risk-service/src/main.rs`, and `src/qasm/examples/service/qasm_service.py`.
- [ ] `[pending]` Execute fault-injection tests (downstream timeout, partial outage, malformed payload bursts).
- [ ] `[pending]` Verify graceful shutdown and restart behavior for all services.

Observability/RED reconciliation (2026-05-10):
- Implemented baseline observability for API services: request-ID generation/echo plus structured request logs in `src/go/gateway/server.go`, `src/go/discovery/cmd/discovery/main.go`, `src/python/service.py`, `src/rust/risk-service/src/main.rs`, and `src/qasm/examples/service/qasm_service.py`.
- Implemented probe semantics for those services: `/health`, `/live`, and `/ready` (service files above).
- RED metrics status: `pending` for explicit metrics export/instrumentation (`/metrics` or equivalent counters/histograms are not yet evidenced in this repo snapshot).

## SLO and Performance
- [ ] `[pending]` Finalize SLOs for: gateway API, HNDL scoring, risk/proof generation.
- [ ] `[pending]` Implement RED dashboards showing latency (p50/p95/p99), error rate, and throughput per service.
- [ ] `[pending]` Define error budgets and alert rules (including burn-rate alerts).
- [ ] `[pending]` Run load/perf tests that include a 10k-asset-equivalent scoring scenario.
- [ ] `[pending]` Capture benchmark evidence and sign off that targets are met.

## Disaster Recovery (DR)
- [x] `[done]` Document RTO/RPO targets for each critical data path and service. Evidence: `docs/dev-docs/phase1/phase5/02-dr-drill-template.md`
- [ ] `[pending]` Create backup/restore procedures for stateful components and artifact storage.
- [ ] `[pending]` Run at least one DR drill (service loss + data restore) and record recovery timings. Template/log: `docs/dev-docs/phase1/phase5/02-dr-drill-template.md`
- [ ] `[pending]` Verify dependency failover/fallback procedures and communications path.

## Compliance and Auditability
- [x] `[done]` Build controls-to-evidence matrix covering required framework obligations. Evidence: `docs/dev-docs/phase1/phase5/03-controls-evidence-matrix.md`
- [ ] `[pending]` Ensure immutable audit-event coverage for discovery, analysis, scoring, proof, and release actions.
- [ ] `[pending]` Validate evidence retention policy and access controls for audit artifacts.
- [ ] `[pending]` Produce release evidence pack (test reports, security reports, DR report, approvals).

## Release Governance
- [ ] `[pending]` Establish change freeze window and rollback criteria.
- [ ] `[external]` Complete on-call readiness: rota, escalation matrix, incident commander coverage.
- [ ] `[external]` Run incident response exercise and document lessons + action closure owners.
- [ ] `[external]` Conduct final go/no-go review with Engineering, Security, SRE/Ops, and Product sign-off.
- [ ] `[external]` Tag release and archive all GA approval records.

## Definition of Done (Phase 5)
All checklist sections are complete, evidence is linked in the release record, and approvers sign off with no unresolved Critical risks.
