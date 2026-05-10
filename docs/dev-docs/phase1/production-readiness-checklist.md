# Phase 5 Production Readiness Checklist

Use this checklist as the GA gate for **Phase 5: Hardening + Production Readiness**.

## Security
- [ ] Publish and approve service threat model updates for gateway, discovery, python-analysis, rust-risk, qasm services.
- [ ] Enable dependency/container vulnerability scanning in CI with blocking policy for Critical/High issues.
- [ ] Generate SBOMs for all service images and store signed artifacts with build provenance.
- [ ] Confirm secret handling: no secrets in repo, short-lived credentials, rotation runbook tested.
- [ ] Validate authN/authZ controls (OIDC/JWT + role checks) on all externally reachable endpoints.
- [ ] Complete external/internal pen-test; all findings remediated or risk-accepted in writing.

## Reliability and Operations
- [ ] Define production runbooks for startup, rollback, dependency outage, and degraded-mode operation.
- [ ] Add structured logs, request IDs/trace IDs, and core RED metrics for all API paths.
- [ ] Add health/readiness/liveness semantics beyond basic `/health` checks.
- [ ] Execute fault-injection tests (downstream timeout, partial outage, malformed payload bursts).
- [ ] Verify graceful shutdown and restart behavior for all services.

## SLO and Performance
- [ ] Finalize SLOs for: gateway API, HNDL scoring, risk/proof generation.
- [ ] Implement dashboards showing latency (p50/p95/p99), error rate, and throughput per service.
- [ ] Define error budgets and alert rules (including burn-rate alerts).
- [ ] Run load/perf tests that include a 10k-asset-equivalent scoring scenario.
- [ ] Capture benchmark evidence and sign off that targets are met.

## Disaster Recovery (DR)
- [ ] Document RTO/RPO targets for each critical data path and service.
- [ ] Create backup/restore procedures for stateful components and artifact storage.
- [ ] Run at least one DR drill (service loss + data restore) and record recovery timings.
- [ ] Verify dependency failover/fallback procedures and communications path.

## Compliance and Auditability
- [ ] Build controls-to-evidence matrix covering required framework obligations.
- [ ] Ensure immutable audit-event coverage for discovery, analysis, scoring, proof, and release actions.
- [ ] Validate evidence retention policy and access controls for audit artifacts.
- [ ] Produce release evidence pack (test reports, security reports, DR report, approvals).

## Release Governance
- [ ] Establish change freeze window and rollback criteria.
- [ ] Complete on-call readiness: rota, escalation matrix, incident commander coverage.
- [ ] Run incident response exercise and document lessons + action closure owners.
- [ ] Conduct final go/no-go review with Engineering, Security, SRE/Ops, and Product sign-off.
- [ ] Tag release and archive all GA approval records.

## Definition of Done (Phase 5)
All checklist sections are complete, evidence is linked in the release record, and approvers sign off with no unresolved Critical risks.
