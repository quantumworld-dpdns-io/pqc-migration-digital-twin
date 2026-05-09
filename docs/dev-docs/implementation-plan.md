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
