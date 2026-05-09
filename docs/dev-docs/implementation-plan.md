# PQC Migration Planner Implementation Plan

## 1. Scope and Outcomes

This implementation plan delivers a production-capable **post-quantum cryptography (PQC) migration planner** aligned to repository direction:

- Discover cryptographic assets across certificates, TLS, SSH, and VPN footprints.
- Quantify **Harvest-Now-Decrypt-Later (HNDL)** exposure.
- Compute migration risk with a transparent scoring engine.
- Generate **zero-knowledge (ZK) migration proofs** for auditability without disclosing sensitive key material.

Primary outcomes:

- Actionable migration backlog by system, algorithm family, and business criticality.
- Verifiable evidence trail for governance, compliance, and readiness reviews.
- Cost-controlled multi-agent analysis workflows with measurable token efficiency.

## 2. System Vision and Architecture

### 2.1 High-Level Components

1. **Asset Discovery Service (Go)**

- Connectors/scanners for PKI stores, load balancers, API gateways, SSH known_hosts/authorized_keys, VPN concentrators.
- Normalizes cert/key metadata (issuer, algorithm, key length, validity, endpoint mapping).

2. **Exposure Analysis Service (Python)**

- HNDL heuristics and policy checks over discovered assets and traffic sensitivity windows.
- Data enrichment using business tags and system criticality.

3. **Risk Scoring Engine (Rust)**

- Deterministic scoring pipeline for confidentiality, integrity, operational complexity, exploit horizon, and migration blast radius.
- Exposes explainable per-factor contribution output.

4. **ZK Proof Service (Rust)**

- Produces attestations that migration conditions are met (e.g., approved algorithm set, minimum key sizes, staged rollout constraints) without revealing protected secrets.
- Anchors proof references and hashes in the platform data store.

5. **QASM Workflow Service (Python + Rust FFI optional)**

- Generates and executes QASM-based simulation/validation tasks for PQ-safe path checks and scenario analysis.
- Stores reproducible workflow manifests and results.

6. **API Gateway + Orchestration (Go)**

- Public API for UI/automation clients.
- Job orchestration, workflow state machine, authn/authz, rate limits, and audit logs.

7. **Frontend (Next.js)**

- Dashboard and planning UI.
- Visual direction inspired by IBM Quantum Composer: graph-first, node-link orchestration views, progressive reveal panels, strong contrast and technical-art aesthetic.

8. **Data Platform**

- PostgreSQL for transactional entities.
- Object store for scan artifacts, proof bundles, and QASM outputs.
- Optional Redis for queue state/cache.

### 2.2 Service Boundaries

- **Go**: ingestion, APIs, orchestration, integrations requiring network/system IO concurrency.
- **Rust**: high-trust deterministic computation (risk scoring core, ZK proofs, crypto policy validators).
- **Python**: analytics and rapid workflow iteration (HNDL analysis, QASM pipeline experimentation).

Boundaries are contract-first with versioned APIs and schema compatibility checks in CI.

## 3. API and Contract Design

### 3.1 External API Domains

1. `POST /v1/discovery/jobs`

- Start scan job by scope (org/account/network segment/system tags).

2. `GET /v1/discovery/jobs/{job_id}`

- Retrieve job state, progress, and summary counts.

3. `GET /v1/assets`

- Query normalized assets (cert/TLS/SSH/VPN) with filters and pagination.

4. `POST /v1/analysis/hndl`

- Run HNDL exposure analysis on asset subsets or full scope.

5. `POST /v1/risk/score`

- Execute/refresh risk scoring; returns aggregate and factorized scores.

6. `POST /v1/migration/proofs`

- Generate ZK migration proof package for selected migration wave.

7. `POST /v1/qasm/workflows`

- Launch QASM scenario workflow for selected strategy.

8. `GET /v1/plans/milestones`

- Retrieve current migration roadmap, status, blockers, and acceptance checkpoints.

### 3.2 Internal Contracts

- Protobuf/gRPC for service-to-service calls where throughput and strict typing matter.
- JSON REST for UI and external integrators.
- Event schema (`scan.completed`, `analysis.ready`, `proof.generated`) published to queue/bus.

## 4. Core Data Model

### 4.1 Entities

- `asset`
- `asset_id`, `asset_type` (cert/tls/ssh/vpn), `owner`, `environment`, `algorithm`, `key_strength`, `expires_at`, `source`, `fingerprint`.
- `endpoint_binding`
- Maps assets to host/service/interface/protocol contexts.
- `hndl_exposure_record`
- Exposure window, data sensitivity tier, estimated retention risk, confidence score, rationale.
- `risk_assessment`
- Composite score, per-factor scores, policy violations, recommendation category.
- `migration_wave`
- Planned batch with dependencies, freeze windows, rollback policy, success metrics.
- `zk_proof_record`
- Proof id, statement hash, verifier params version, artifact URI, verification status.
- `qasm_workflow_run`
- Workflow definition, backend/runtime config, output artifact references, reproducibility hash.
- `audit_event`
- Actor, action, object, result, timestamp, trace id.

### 4.2 Data Governance

- Strict PII/secret minimization: no raw private keys stored.
- Field-level encryption for sensitive metadata.
- Retention policy by environment/classification.

## 5. Multi-Phase Execution Plan

## Phase 0: Foundations (Weeks 1-2)

Deliverables:

- Monorepo service skeletons for Go/Rust/Python/Next.js.
- Contract definitions (OpenAPI + protobuf) and schema migration baseline.
- CI baseline with lint/test/build/security scanning.

Acceptance criteria:

- All services build in CI with pinned toolchains.
- API gateway serves health plus deterministic MVP discovery/risk/proof/QASM endpoints under `/api/v1/*`.
- Local dev stack bootstraps with one command.

## Phase 1: Asset Discovery + Inventory Graph (Weeks 3-6)

Deliverables:

- Certificate/TLS/SSH/VPN connectors with normalized ingestion pipeline.
- Asset and endpoint binding persistence.
- UI inventory views with topology graph and filtering.

Acceptance criteria:

- Scan coverage supports at least 3 source systems per asset class.
- Deduplication and fingerprint reconciliation accuracy >= 99% on test corpus.
- End-to-end trace from scan trigger to persisted inventory and UI display.

## Phase 2: HNDL Exposure + Risk Scoring (Weeks 7-10)

Deliverables:

- HNDL analysis engine with policy templates and confidence scoring.
- Rust risk scoring engine with explainability output.
- Prioritized migration recommendations exposed via API/UI.

Acceptance criteria:

- Deterministic scoring reproducibility across environments.
- Risk score latency under target SLO for 10k assets batch.
- Analysts can export ranked migration backlog with rationale.

## Phase 3: ZK Migration Proofs + Governance (Weeks 11-14)

Deliverables:

- ZK proof generation and verification endpoints.
- Proof artifact lifecycle and audit trail integration.
- Governance dashboards (proof status, exception register, verifier version drift).

Acceptance criteria:

- Independent verifier can validate proof packages.
- Proof creation does not expose secret material in logs/artifacts.
- Audit events complete for generation/verification workflows.

## Phase 4: QASM Workflows + Advanced Planning UX (Weeks 15-18)

Deliverables:

- QASM scenario authoring/execution pipeline.
- Strategy simulation results integrated into planning recommendations.
- Next.js experience with Composer-inspired orchestration canvas, wave editor, and milestone board.

Acceptance criteria:

- Workflow reproducibility via versioned manifests and artifact hashes.
- UI supports scenario compare and migration wave what-if planning.
- Product sign-off on usability and visual direction.

## Phase 5: Hardening + Production Readiness (Weeks 19-22)

Deliverables:

- Performance tuning, fault-injection tests, DR runbooks.
- Security hardening, pen-test remediation, compliance evidence pack.
- GA release checklist and operational SLO dashboard.

Acceptance criteria:

- SLOs met for API, scoring, and proof generation paths.
- Critical/high vulnerabilities remediated or formally accepted.
- On-call runbook and incident drill pass.

## 5.1 Current Status Snapshot (2026-05-09)

Execution status by phase:

- Phase 0: `Completed`
- Phase 1: `Partially completed`
- Phase 2: `Partially completed`
- Phase 3: `Partially completed`
- Phase 4: `Partially completed`
- Phase 5: `Not started`

Evidence basis:

- Cross-language scaffolds exist for Go, Rust, Python, QASM, and Next.js under `src/`.
- CI and Make targets are active (`.github/workflows/ci.yml`, `Makefile`) including lint/test/contracts and Docker integration smoke.
- Gateway OpenAPI contract is versioned at `docs/api/gateway-openapi.json` with contract smoke checks in `tests/contracts/test_repo_contract_smoke.py`.
- Dockerized microservices and integration smoke script exist (`docker-compose.microservices.yml`, `tests/integration/docker_microservices_smoke.sh`).

## 5.2 Per-Phase Execution Checklist

### Phase 0: Foundations

- Completion state: `Completed`
- Delivered artifacts:
  - Monorepo service skeletons: `src/go`, `src/rust`, `src/python`, `src/qasm`, `src/web`.
  - Contract baseline: `docs/api/gateway-openapi.json`.
  - CI and quality gates: `.github/workflows/ci.yml`, `Makefile`, `tests/contracts/test_repo_contract_smoke.py`.
  - One-command local microservice bootstrap: `make docker-up` via `docker-compose.microservices.yml`.
- Acceptance criteria status:
  - Services build/test in CI with pinned versions: `Met`.
  - Gateway serves deterministic MVP `/api/v1/*` routes: `Met`.
  - Local stack bootstraps with one command: `Met`.
- Remaining acceptance criteria: `None`.

### Phase 1: Asset Discovery + Inventory Graph

- Completion state: `Partially completed`
- Delivered artifacts:
  - Discovery service and scanner scaffolding: `src/go/discovery/scanner.go`, `src/go/discovery/scanners_stub.go`.
  - Gateway discovery endpoint and proxy wiring: `src/go/gateway/server.go`.
  - Initial inventory UI table/heatmap components: `src/web/components/InventoryTable.tsx`, `src/web/components/HndlHeatmap.tsx`.
- Acceptance criteria status:
  - 3+ source systems per asset class: `Not met` (connectors are scaffold/stub level).
  - Dedup/reconciliation >=99% on corpus: `Not met` (no validation corpus/harness present).
  - End-to-end scan to persisted inventory to UI: `Not met` (no persistence layer implemented yet).
- Concrete next actions:
  - Implement real connector adapters for cert/TLS/SSH/VPN and normalize outputs into a shared asset schema.
  - Add persistence for `asset` and `endpoint_binding` entities (PostgreSQL migrations + repository layer).
  - Add discovery accuracy test corpus and reconciliation benchmark in CI.

### Phase 2: HNDL Exposure + Risk Scoring

- Completion state: `Partially completed`
- Delivered artifacts:
  - Python HNDL analysis modules and tests: `src/python/hndl_analysis/*`, `src/python/tests/test_hndl_scoring.py`.
  - Rust deterministic scoring engine and service: `src/rust/risk-engine/src/lib.rs`, `src/rust/risk-service/src/main.rs`.
  - Risk-related UI components: `src/web/components/RiskMatrix.tsx`.
- Acceptance criteria status:
  - Deterministic reproducibility across environments: `Partially met` (unit tests exist; cross-environment reproducibility suite not yet explicit).
  - 10k asset latency SLO: `Not met` (no performance benchmark harness committed).
  - Exportable ranked backlog with rationale: `Partially met` (scoring output exists; export workflow/API not complete).
- Concrete next actions:
  - Add cross-environment reproducibility fixture suite for scoring/HNDL outputs.
  - Add 10k-asset benchmark and enforce latency threshold in CI/perf job.
  - Add API/UI export endpoint for ranked migration backlog and rationale payload.

### Phase 3: ZK Migration Proofs + Governance

- Completion state: `Partially completed`
- Delivered artifacts:
  - ZK proof crate and tests: `src/rust/zk-proof/src/lib.rs`.
  - Proof panel UI component: `src/web/components/ProofPanel.tsx`.
  - Gateway proof endpoint shape and OpenAPI path definitions.
  - Verifier path scaffold and audit path scaffold are present (structure only; not production-complete).
- Acceptance criteria status:
  - Independent verifier validation of proof packages: `Partially met` (verifier path scaffold exists; end-to-end external verification workflow is not complete).
  - No secret material leakage in logs/artifacts: `Partially met` (design intent present; no dedicated leakage test suite committed).
  - Complete audit events for generate/verify flow: `Partially met` (audit path scaffold exists; persistence + full event lifecycle are not complete).
- Concrete next actions:
  - Implement verifier CLI/service behavior on the scaffolded path and validate exported proof bundles outside core runtime.
  - Add redaction/leakage regression tests for proof generation logs/artifacts.
  - Implement `audit_event` persistence, proof lifecycle event emission, and verification of end-to-end audit completeness.

### Phase 4: QASM Workflows + Advanced Planning UX

- Completion state: `Partially completed`
- Delivered artifacts:
  - QASM manifest and runner modules: `src/python/qasm_workflows/manifest.py`, `src/python/qasm_workflows/runner.py`.
  - Example QASM service and assets: `src/qasm/examples/service/qasm_service.py`, `src/qasm/examples/bell_pair.qasm`.
  - Dashboard UI baseline: `src/web/app/page.tsx` and components in `src/web/components/`.
- Acceptance criteria status:
  - Reproducibility via versioned manifests + artifact hashes: `Partially met` (manifest workflow exists; artifact hashing/version lifecycle incomplete).
  - Scenario compare and what-if planning UX: `Not met` (current UI is dashboard scaffold, no scenario comparison flow yet).
  - Product sign-off on usability/visual direction: `Not met` (no recorded sign-off artifacts).
- Concrete next actions:
  - Extend QASM run records with immutable artifact hash/version metadata and verification checks.
  - Implement scenario comparison and wave-editing workflows in Next.js.
  - Execute usability review and capture sign-off criteria/results in dev docs.

### Phase 5: Hardening + Production Readiness

- Completion state: `Not started`
- Delivered artifacts:
  - Foundational quality controls only (lint/test/contracts/integration smoke in CI).
- Acceptance criteria status:
  - SLO attainment for API/scoring/proof paths: `Not met`.
  - Vulnerability remediation/acceptance workflow: `Not met`.
  - On-call runbook + incident drill pass: `Not met`.
- Concrete next actions:
  - Add observability SLO dashboard and automated SLO conformance checks.
  - Add security scan + triage workflow and documented exception process.
  - Author DR/on-call runbooks and execute at least one incident simulation drill.

## 6. CI/CD, Testing, and Quality Gates

### 6.1 CI/CD Pipeline

- Per-service lint + unit tests on PR.
- Contract compatibility checks (OpenAPI/protobuf drift gates).
- Integration tests with ephemeral dependencies.
- Artifact signing and provenance (SBOM + signature verification).
- Progressive delivery: dev -> staging -> production with approval gates.

### 6.2 Testing Strategy

- Unit tests: parser/normalizer/scoring/proof logic.
- Integration tests: connector-to-db, API-to-service orchestration.
- End-to-end tests: scan -> analyze -> score -> proof -> UI recommendation flow.
- Property/fuzz tests for Rust critical modules.
- Snapshot/visual regression tests for Next.js planning views.

## 7. Security Controls

- OIDC/JWT authn with RBAC/ABAC policies.
- mTLS between internal services.
- Secrets in managed vault; short-lived credentials.
- Immutable audit logs with tamper-evidence.
- Data classification tags and least-privilege access paths.
- Supply chain controls: signed builds, pinned dependencies, SCA, and policy enforcement.

## 8. Multi-Agent Token Optimization and Cost Control

1. **Task decomposition policy**

- Route narrow, deterministic subtasks to specialized agents; reserve large-context orchestrator only for synthesis.

2. **Context budget guardrails**

- Hard token ceilings per step; truncate logs and use structured summaries.

3. **Caching and memoization**

- Cache connector metadata, scoring intermediates, and proof verification results keyed by stable hashes.

4. **Incremental recomputation**

- Re-score only impacted assets on deltas; avoid full recomputation unless policy/version changes.

5. **Prompt/response schema constraints**

- Enforce structured JSON outputs to reduce verbose free-text generation.

6. **Model tiering**

- Use cheaper models for extraction/classification and premium models for final decision synthesis.

7. **Cost observability**

- Track per-workflow token spend, latency, error rate; set auto-throttle and budget alarms.

## 9. Operational Metrics and Success KPIs

- Discovery coverage (% known systems inventoried).
- HNDL exposure reduction over time.
- Migration backlog burn-down rate.
- % assets migrated to PQ-safe profiles.
- Proof verification success rate.
- Mean time to identify and remediate high-risk assets.

## 10. Key Risks and Mitigations

- **Connector variability risk**: build adapter conformance tests and fallback parsers.
- **False-positive exposure scoring**: calibrate with labeled cases and confidence thresholds.
- **Proof complexity adoption**: ship verifier tooling and clear governance playbooks.
- **Cross-language contract drift**: strict CI compatibility gates and version lifecycle policy.
