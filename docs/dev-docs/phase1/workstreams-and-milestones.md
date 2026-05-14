# PQC Migration Planner Workstreams and Milestones

## 1. Delivery Model

Execution is organized into parallel workstreams with synchronized milestone gates. Each workstream has explicit deliverables, acceptance criteria, and integration dependencies.

## 2. Workstreams

## WS1. Platform and Architecture (Go-focused)

Scope:
- API gateway, orchestration engine, authn/authz integration, job lifecycle.
- Service contracts and cross-service reliability controls.

Deliverables:
- Versioned OpenAPI + protobuf contracts.
- Orchestration state machine for discovery/analysis/scoring/proof/QASM pipelines.
- Observability baseline (logs, metrics, tracing).

Acceptance criteria:
- 99.9% successful orchestration completion rate in staging test suite.
- Endpoints enforce auth and tenant boundaries.
- Contract checks block breaking changes in CI.

## WS2. Asset Discovery and Inventory

Scope:
- Cert/TLS/SSH/VPN connectors, normalization, deduplication, topology mapping.

Deliverables:
- Connector SDK pattern and at least 12 production-grade adapters across asset classes.
- Inventory graph endpoints and export utilities.

Acceptance criteria:
- Coverage target met for priority environments.
- Duplicate asset suppression accuracy >= 99%.
- Discovery jobs resumable after transient failures.

## WS3. HNDL Exposure Analysis (Python)

Scope:
- Exposure heuristics, sensitivity weighting, confidence model, policy templates.

Deliverables:
- HNDL engine with policy pack v1.
- Explainability report payload for each exposure record.

Acceptance criteria:
- Benchmark dataset precision/recall meets agreed threshold.
- Analysts can tune policy weights without code changes.
- Full auditability of analysis inputs and outputs.

## WS4. Risk Scoring Engine (Rust)

Scope:
- Deterministic scoring, factor attribution, policy violation engine.

Deliverables:
- Rust scoring library + service wrapper.
- Stable scoring schema and reproducibility harness.

Acceptance criteria:
- Same inputs always produce same scores and factor outputs.
- Batch scoring throughput meets SLO target.
- Fuzz/property tests pass in CI.

## WS5. ZK Migration Proofs (Rust)

Scope:
- Proof statement design, generation service, verification tooling, audit linkage.

Deliverables:
- Proof generator/verifier APIs.
- Proof artifact registry and verification dashboard feed.

Acceptance criteria:
- External verifier validates proofs without privileged runtime access.
- No secret leakage in artifacts or logs.
- Governance team sign-off on verification evidence format.

## WS6. QASM Workflow Pipeline

Scope:
- Scenario DSL/manifests, execution runner, reproducibility and artifact management.

Deliverables:
- QASM workflow templates for migration strategy simulation.
- Comparative scenario reports consumed by planning UI.

Acceptance criteria:
- Deterministic rerun from saved manifest + inputs.
- Workflow outputs traceable to source assets and scoring context.
- Failure handling and retry semantics documented and tested.

## WS7. Frontend Product Experience (Next.js)

Scope:
- Planning dashboard, risk/exposure surfaces, migration wave builder, milestone tracking.
- Artistic direction inspired by IBM Quantum Composer (technical canvas, node-link metaphor, high-contrast scientific aesthetic).

Deliverables:
- Inventory map, HNDL heatmap, risk matrix, proof status panel, QASM scenario compare board.
- Design tokens and component library aligned to visual direction.

Acceptance criteria:
- Usability tests show successful completion of core planning tasks.
- Responsive behavior validated for desktop/tablet.
- Visual regression suite stable in CI.

## WS8. Security, Compliance, and Reliability

Scope:
- Threat model, hardening, SBOM/provenance, pen-test closure, DR readiness.

Deliverables:
- Security controls matrix mapped to services.
- Incident response and disaster recovery runbooks.

Acceptance criteria:
- No open critical vulnerabilities at release.
- Required compliance evidence complete and reviewable.
- DR drill passes RTO/RPO targets.

## WS9. Agentic Efficiency and Cost Governance

Scope:
- Multi-agent workflow policy, token budgets, model tiering, cost observability.

Deliverables:
- Token budget policy by pipeline stage.
- Cost/performance dashboards and alerting.

Acceptance criteria:
- Token cost per completed workflow under budget target.
- Auto-throttle prevents budget overrun.
- Quality remains within defined confidence thresholds despite optimization.

## 3. Milestone Schedule

## 3A. Status Scoreboard (As of 2026-05-09)

Status legend: `done`, `in-progress`, `not-started`.

### Workstream Status (WS1-WS9)

| Workstream | Status | Evidence (repo artifacts) |
| --- | --- | --- |
| WS1 Platform and Architecture | in-progress | `docs/api/gateway-openapi.json`; `src/go/gateway/server.go`; `tests/contracts/test_repo_contract_smoke.py`; `docs/dev-docs/implementation-progress-log.md` |
| WS2 Asset Discovery and Inventory | in-progress | `src/go/discovery/scanner.go`; `src/go/discovery/scanners_stub.go`; `src/go/discovery/scanner_test.go`; `src/go/discovery/README.md` |
| WS3 HNDL Exposure Analysis | in-progress | `src/python/hndl_analysis/scorer.py`; `src/python/hndl_analysis/policy_templates.py`; `src/python/tests/test_hndl_scoring.py` |
| WS4 Risk Scoring Engine | in-progress | `src/rust/risk-engine/src/lib.rs`; `src/rust/risk-service/src/main.rs`; `src/rust/risk-engine/Cargo.toml` |
| WS5 ZK Migration Proofs | in-progress | `src/rust/zk-proof/src/lib.rs`; `src/rust/zk-proof/Cargo.toml`; `docs/dev-docs/implementation-progress-log.md` |
| WS6 QASM Workflow Pipeline | in-progress | `src/python/qasm_workflows/manifest.py`; `src/python/qasm_workflows/runner.py`; `src/qasm/examples/bell_pair.qasm`; `src/python/tests/test_runner.py` |
| WS7 Frontend Product Experience | in-progress | `src/web/app/page.tsx`; `src/web/components/HndlHeatmap.tsx`; `src/web/components/RiskMatrix.tsx`; `src/web/tests/dashboard.smoke.test.mjs` |
| WS8 Security, Compliance, and Reliability | not-started | Security/reliability hardening artifacts and DR runbooks not yet present in `docs/` or `src/`; current state is scaffold + baseline tests only (`Makefile`, `tests/contracts/test_repo_contract_smoke.py`). |
| WS9 Agentic Efficiency and Cost Governance | not-started | Token budget policies/cost dashboards not yet present; no WS9-specific policy or observability artifact found under `docs/` or `src/`. |

### Milestone Status (M0-M5)

| Milestone | Status | Evidence (repo artifacts) |
| --- | --- | --- |
| M0 Architecture Baseline Complete | done | `Makefile`; `docs/api/gateway-openapi.json`; `src/go/gateway/server.go`; `docker-compose.microservices.yml`; `docs/dev-docs/implementation-progress-log.md` (Updates #16-#20) |
| M1 Discovery MVP Complete | in-progress | Discovery service and gateway path exist: `src/go/discovery/scanner.go`, `src/go/gateway/server.go`; integration smoke exists: `tests/integration/docker_microservices_smoke.sh`; connector breadth and full inventory graph acceptance criteria still open. |
| M2 Exposure + Risk Prioritization Complete | in-progress | HNDL + risk service scaffolds exist (`src/python/hndl_analysis/*`, `src/rust/risk-engine/*`) and are wired through gateway/proxy paths; end-to-end prioritization UX/acceptance thresholds not yet complete. |
| M3 ZK Proof Governance Complete | not-started | Proof crate/service scaffold exists (`src/rust/zk-proof/src/lib.rs`), but governance acceptance artifacts (independent verifier process, governance sign-off evidence format) are not yet documented in `docs/`. |
| M4 QASM-Driven Planning UX Complete | not-started | QASM runner/examples exist (`src/python/qasm_workflows/*`, `src/qasm/examples/*`), but scenario comparison planning UX and approval workflow deliverables are not yet present in `src/web/`. |
| M5 Production Readiness and GA | not-started | Hardening/DR/compliance/FinOps release artifacts are not yet present as complete deliverables; current repo reflects scaffold maturity. |

### Milestone Forecast (Calendarized From Current Scaffold Maturity)

Assumptions:
- Baseline scaffold is complete (`M0` done), but WS2-WS7 require implementation depth beyond scaffold and WS8-WS9 are not started.
- Forecast keeps the original milestone sequencing with realistic delivery ramp from current state.

| Milestone | Forecast | Confidence | Rationale |
| --- | --- | --- | --- |
| M0 | done on 2026-05-09 | high | Core contracts, multi-service scaffold, tests, and Docker smoke are already in repo. |
| M1 | target 2026-06-19 | medium | Discovery MVP plumbing exists; remaining work is production-grade connector depth, normalization completeness, and inventory quality gates. |
| M2 | target 2026-07-17 | medium | HNDL/risk foundations exist; needs integrated prioritization outputs and threshold-backed validation. |
| M3 | target 2026-08-14 | low-medium | ZK technical scaffold exists, but governance workflow/evidence packaging is mostly ahead. |
| M4 | target 2026-09-11 | low-medium | QASM and UI components exist independently; integrated scenario planning UX still substantial. |
| M5 | target 2026-10-09 | low | WS8/WS9 are not started and typically have integration-heavy, cross-workstream critical path risk. |

## M0: Architecture Baseline Complete (End Week 2)

Dependencies:
- WS1 foundational contracts, CI, environments.

Exit criteria:
- Core repos bootstrapped; CI green; gateway skeleton and auth scaffolding active.

## M1: Discovery MVP Complete (End Week 6)

Dependencies:
- WS2 integrated with WS1 API and data model.
- WS7 inventory UX initial release.

Exit criteria:
- Cert/TLS/SSH/VPN discovery works end-to-end for defined pilot scope.

## M2: Exposure + Risk Prioritization Complete (End Week 10)

Dependencies:
- WS3 and WS4 integrated with WS1 orchestration and WS7 surfaces.

Exit criteria:
- HNDL and risk ranking generate actionable migration backlog with explanations.

## M3: ZK Proof Governance Complete (End Week 14)

Dependencies:
- WS5 proof generation/verification integrated with audit model and UI.

Exit criteria:
- Verification workflow accepted by governance stakeholders.

## M4: QASM-Driven Planning UX Complete (End Week 18)

Dependencies:
- WS6 outputs consumed by WS7 scenario planning features.

Exit criteria:
- Teams can simulate, compare, and approve migration waves from UI.

## M5: Production Readiness and GA (End Week 22)

Dependencies:
- WS8 hardening/reliability plus WS9 cost governance controls.

Exit criteria:
- SLOs met, security sign-off complete, on-call/readiness approved.

## 4. Team Parallelization Plan

Suggested squads:
- **Squad A (Core Platform)**: WS1 + shared contracts + release engineering.
- **Squad B (Discovery/Data)**: WS2 + data model/ingestion reliability.
- **Squad C (Analytics/Crypto)**: WS3 + WS4 + WS5.
- **Squad D (Simulation/UX)**: WS6 + WS7.
- **Squad E (Security/Ops/FinOps)**: WS8 + WS9.

Coordination cadence:
- Twice-weekly cross-squad integration sync.
- Weekly architecture council for contract/version changes.
- Milestone gate reviews with explicit go/no-go criteria.

## 5. Milestone Deliverable Matrix

- M0: contract specs, CI pipeline, service skeletons, architecture ADRs.
- M1: discovery connectors, normalized inventory, topology UI.
- M2: HNDL reports, risk scoring API, ranked migration queue.
- M3: ZK proof APIs, verifier tooling, audit evidence trail.
- M4: QASM workflow templates, scenario comparison UI.
- M5: hardening report, DR drill report, GA readiness checklist.

## 6. Cross-Workstream Acceptance Gates

- **Gate A (Contract Integrity)**: no breaking API/schema drift without version bump and migration notes.
- **Gate B (Data Trustworthiness)**: reproducible ingestion and scoring outputs with traceability.
- **Gate C (Security and Privacy)**: secrets handling, encryption, least privilege, immutable audits validated.
- **Gate D (Operational Readiness)**: runbooks, SLO dashboards, incident drills complete.
- **Gate E (Cost Discipline)**: token and infra spend within approved budget envelopes.
