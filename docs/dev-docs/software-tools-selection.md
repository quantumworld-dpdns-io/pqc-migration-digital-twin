# Software Tool Selection & Suitability Map for PQC Migration Planner

## Purpose
This document maps the tools under `.ignore/software-tools/` to this project's implementation roadmap for a PQC migration digital twin/planner.

Adoption phases:
- `P0 Now`: start in current implementation wave.
- `P1 Next`: adopt after core planner is stable.
- `P2 Deferred`: promising but blocked by scope/maturity/dependency.
- `Not selected now`: currently out of scope for this project.

Status labels:
- `Selected`: actively planned for the planner.
- `Deferred`: keep on watchlist; revisit at explicit checkpoint.

## 1) PQC / Security / Runtime Protection

| Tool | Status | Role in project | Runtime fit | Phase | Integration note |
|---|---|---|---|---|---|
| PQC Libraries (liboqs family) | Selected | Core crypto simulation target for algorithm migration scenarios, policy checks, and compatibility modeling | Go, Rust, Python | P0 Now | Build adapter layer to model algorithm inventory (e.g., Kyber/ML-KEM, Dilithium/ML-DSA), fallback behavior, and migration risk scoring. |
| Cilium Tetragon | Deferred | Runtime security telemetry for planner services and agents | Linux/K8s, Go ecosystems | P2 Deferred | Adopt only when production threat-detection for host/runtime behavior is in scope; not required for planner MVP. |
| Apache Teaclave | Deferred | Confidential-computing option for high-trust execution of sensitive migration data | Rust/C++ enclaves, service-side | P2 Deferred | Requires enclave/TEE architecture; evaluate only for regulated deployments. |
| KawaiiGPT (defensive awareness) | Not selected now | Security awareness reference, not a platform dependency | N/A | Not selected now | Keep as governance/training material, not runtime component. |

## 2) Agent Protocols, Tooling, and Orchestration

| Tool | Status | Role in project | Runtime fit | Phase | Integration note |
|---|---|---|---|---|---|
| Model Context Protocol (MCP) | Selected | Standard tool interface for planner agents to call inventory scanners, policy engines, and data connectors | Python/Node/Go tool servers | P0 Now | Define internal MCP servers for asset inventory, control evidence lookup, and migration-plan generation. |
| OpenAPI Tool Calling | Selected | Deterministic API execution path for agent actions into internal services | Any HTTP stack (Go/Next.js/Python) | P0 Now | Publish strict OpenAPI schemas for planner APIs and enforce schema-first tool contracts. |
| Agent Skills | Selected | Reusable capability modules (risk analysis, crypto inventory triage, remediation drafting) | Markdown + agent runtime | P1 Next | Store project skills in repo and version with planner releases. |
| Desktop Extensions (DXT/MCPB) | Deferred | Distribution format for local enterprise users | Desktop agent environments | P2 Deferred | Defer until user-facing desktop packaging is a requirement. |
| LangGraph & CrewAI | Selected | Stateful multi-step orchestration for migration planning and review loops | Python (+ JS for LangGraph variants) | P1 Next | Start with one orchestrator path (recommend LangGraph) and add role-based delegation only when needed. |

## 3) AI Agents & Coding Assistants (Engineering Enablement)

| Tool | Status | Role in project | Runtime fit | Phase | Integration note |
|---|---|---|---|---|---|
| Codex Desktop | Selected | Primary coding/automation assistant for repo tasks, refactors, doc and test acceleration | Local dev workflow | P0 Now | Use as engineering accelerator; keep human review + CI gate mandatory. |
| Claude Code | Deferred | Alternate coding agent for parallel validation or comparative productivity | CLI/IDE | P2 Deferred | Optional secondary tool; avoid multi-agent process complexity early. |
| Claude Desktop | Deferred | Desktop assistant with local integrations | Desktop | P2 Deferred | Use only if desktop-specific workflows become required. |
| Devin | Deferred | Autonomous coding experiments for scoped backlog automation | Cloud/agent runtime | P2 Deferred | Evaluate after baseline delivery metrics exist. |
| Hermes Agent | Deferred | Open-source autonomy runtime exploration | Python/agent runtime | P2 Deferred | Not needed until custom autonomous runtime experimentation starts. |

## 4) AI Evaluation & Observability

| Tool | Status | Role in project | Runtime fit | Phase | Integration note |
|---|---|---|---|---|---|
| OpenTelemetry for LLM Apps | Selected | Unified traces/metrics for agent calls, tool latency, and failure analysis | Go, Python, Node.js | P0 Now | Instrument planner APIs + agent tool calls with shared trace IDs and cost/latency tags. |
| Arize Phoenix | Selected | Local/open-source LLM tracing and prompt/run analysis | Python services | P1 Next | Use in evaluation environment for prompt and tool-chain diagnostics. |
| LangSmith | Deferred | Managed tracing/eval platform for LangChain/LangGraph-heavy stacks | Python/JS | P2 Deferred | Revisit if managed SaaS observability is approved. |
| Braintrust | Deferred | Experiment/eval registry for model and prompt benchmarks | Python/JS | P2 Deferred | Defer until benchmark suite and formal eval governance are funded. |
| Weights & Biases Weave | Deferred | Experiment trace and dataset-oriented eval tracking | Python | P2 Deferred | Useful for deeper eval science, but beyond initial planner delivery scope. |

## 5) Data Lakehouse, Query, and Metadata

| Tool | Status | Role in project | Runtime fit | Phase | Integration note |
|---|---|---|---|---|---|
| DuckDB | Selected | Fast local analytical engine for scenario simulation and ad hoc planning queries | Python, CLI, embedded | P0 Now | Use for local/offline simulation packs and reproducible planner scenario runs. |
| Apache Arrow | Selected | Common columnar interchange format between services and analytics components | Go, Rust, Python | P0 Now | Standardize dataframe/record-batch boundaries to reduce serialization overhead. |
| Apache DataFusion | Selected | Rust-native query execution for embedded analytics microservices | Rust | P1 Next | Use when migrating high-volume scenario analytics from Python to Rust services. |
| Apache Iceberg | Deferred | Durable table format for large historical planning datasets | Multi-engine | P2 Deferred | Adopt when dataset scale and multi-engine governance require table versioning/time travel. |
| Trino | Deferred | Federated SQL across heterogeneous enterprise stores | JVM/distributed | P2 Deferred | Only needed when cross-system federation becomes a hard requirement. |
| Apache Polaris | Deferred | Centralized Iceberg catalog and governance | Lakehouse stack | P2 Deferred | Blocked until Iceberg adoption decision is made. |
| Apache Gravitino | Deferred | Federated metadata layer across assets | JVM ecosystem | P2 Deferred | Potential governance value; defer pending metadata complexity growth. |
| Apache Gluten | Not selected now | Spark acceleration layer | Spark/JVM | Not selected now | Out of scope; planner architecture is not Spark-first. |

## 6) Vector DB and Retrieval

| Tool | Status | Role in project | Runtime fit | Phase | Integration note |
|---|---|---|---|---|---|
| Qdrant | Selected | Primary vector retrieval for policy text, migration patterns, and evidence search | Rust core, HTTP/gRPC clients (Go/Python/Node) | P1 Next | Start with single-tenant collection schema; include metadata filters for standards and control families. |
| Chroma | Deferred | Rapid prototyping vector store for local experiments | Python | P2 Deferred | Good for PoCs; avoid production split-brain with another primary vector DB. |
| Weaviate | Deferred | Feature-rich semantic/hybrid retrieval alternative | Cloud/self-hosted | P2 Deferred | Evaluate if hybrid retrieval and module ecosystem outweighs ops complexity. |
| Milvus | Deferred | High-scale vector infrastructure option | Cloud-native | P2 Deferred | Revisit for very large embedding corpora. |
| LanceDB | Deferred | File/lakehouse-oriented vector analytics | Python/Rust | P2 Deferred | Promising for lakehouse alignment; defer until offline analytics and retrieval converge. |

## 7) Local Model Serving and Inference

| Tool | Status | Role in project | Runtime fit | Phase | Integration note |
|---|---|---|---|---|---|
| Ollama | Selected | Developer-local inference for offline demos and reproducible agent tests | Local runtime, REST | P0 Now | Use for local baseline models and deterministic config presets per environment. |
| vLLM | Selected | High-throughput shared inference backend for team/staging workloads | Python/CUDA | P1 Next | Adopt for centralized serving when concurrent agent workloads increase. |
| llama.cpp | Deferred | CPU-first portable inference fallback | C/C++ with bindings | P2 Deferred | Keep as fallback for constrained hardware or air-gapped environments. |
| SGLang | Deferred | Structured high-performance serving/orchestration | Python/CUDA | P2 Deferred | Defer until specific structured generation throughput needs appear. |
| LM Studio | Not selected now | Desktop UX for model exploration | Desktop app | Not selected now | Useful for individual experimentation, not a project runtime dependency. |

## 8) WASM / Cloud-Native Runtime

| Tool | Status | Role in project | Runtime fit | Phase | Integration note |
|---|---|---|---|---|---|
| Wasmtime | Selected | Sandbox runtime for portable policy-check plugins and untrusted extension logic | Rust/C/Go embeddings | P1 Next | Define plugin ABI for deterministic policy-evaluation modules. |
| WASI 0.3 | Deferred | Future-facing WASM component model capability | WASM ecosystem | P2 Deferred | Track maturity and ecosystem support before hard dependency. |
| Fermyon Spin | Deferred | Developer framework for wasm-first microservices | WASM cloud apps | P2 Deferred | Revisit if team commits to wasm-first deployment path. |

## 9) Quantum and Cryptography Modeling

| Tool | Status | Role in project | Runtime fit | Phase | Integration note |
|---|---|---|---|---|---|
| Qiskit | Selected | Quantum-risk and algorithm transition simulation context for planner assumptions | Python | P1 Next | Use for threat-model educational simulations and scenario docs, not production transaction paths. |
| NVIDIA CUDA-Q | Deferred | GPU-accelerated quantum workflow framework | C++/Python + NVIDIA stack | P2 Deferred | Defer unless advanced quantum simulation depth is required. |

## 10) Zero-Knowledge (ZK)

| Tool | Status | Role in project | Runtime fit | Phase | Integration note |
|---|---|---|---|---|---|
| RISC Zero | Deferred | Potential verifiable-computation path for attesting migration-plan outputs | Rust | P2 Deferred | High value for verifiability, but integration complexity is high for MVP. |
| Noir | Deferred | ZK circuit DSL option for compliance-proof workflows | Noir language + proving backends | P2 Deferred | Revisit if external attestation/compliance proof requirements become concrete. |

## 11) Cache / State Infrastructure

| Tool | Status | Role in project | Runtime fit | Phase | Integration note |
|---|---|---|---|---|---|
| Redis (basic + JS patterns + success program guidance) | Selected | Caching, task-state coordination, ephemeral planner session state, rate limiting | Go, Python, Next.js/Node | P0 Now | Implement bounded key design, TTL policy, and explicit retry/backoff patterns from readiness guidance. |
| Dragonfly | Deferred | Redis-compatible high-throughput alternative for scale/cost optimization | Redis protocol clients | P2 Deferred | Benchmark as drop-in candidate only after baseline Redis workload profile is measured. |

## 12) AI Infrastructure / Hardware / Emerging Language

| Tool | Status | Role in project | Runtime fit | Phase | Integration note |
|---|---|---|---|---|---|
| NVIDIA Blackwell Ultra | Not selected now | Hardware procurement option for massive model workloads | Data center GPU platform | Not selected now | Out of scope for near-term planner software delivery. |
| Mojo | Deferred | High-performance experimental language for compute-heavy components | Mojo/Python interop | P2 Deferred | Track maturity; avoid adding early-language risk to core planner roadmap. |

## 13) Commerce / Payments

| Tool | Status | Role in project | Runtime fit | Phase | Integration note |
|---|---|---|---|---|---|
| Google Universal Commerce Protocol (UCP) | Not selected now | Agentic commerce checkout standard | Commerce platforms | Not selected now | No direct relevance to PQC migration planning domain. |

## Not Selected Now (Clearly Out of Scope)

- Apache Gluten: Spark-specific acceleration; planner is not Spark-centered.
- LM Studio: desktop exploration utility rather than project runtime component.
- NVIDIA Blackwell Ultra: infrastructure procurement topic, not immediate software dependency.
- KawaiiGPT briefing: policy awareness material only.
- Google UCP: commerce checkout protocol, unrelated to migration-planning workflows.

## Implementation tracking overlay (current delivery view)

This overlay tracks execution state for the tools marked `Selected` in the suitability map. It does not change suitability decisions; it adds implementation status for delivery management.

| Tool | Implementation state | Owner lane | Current checkpoint |
|---|---|---|---|
| PQC Libraries (liboqs family) | implemented now | Core simulation + policy engine | Adapter and algorithm inventory model active in planner core. |
| Model Context Protocol (MCP) | implemented now | Agent tool interface | Internal MCP servers for inventory and evidence lookup in active use. |
| OpenAPI Tool Calling | configured in CI | Service/API contracts | Schema validation and contract checks enforced in CI gates. |
| Codex Desktop | implemented now | Engineering workflow | Default assistant workflow in daily development loop. |
| OpenTelemetry for LLM Apps | configured in CI | Observability baseline | Trace/metric emission and basic telemetry checks wired into CI verification. |
| DuckDB | implemented now | Local analytics/simulation | Scenario simulation queries and offline packs running in current builds. |
| Apache Arrow | implemented now | Data interchange | Columnar boundaries in active data movement paths. |
| Ollama | implemented now | Local inference | Local model serving profile available for developer and demo workflows. |
| Redis (basic + JS patterns + success program guidance) | implemented now | Cache/state | TTL and bounded-key session state patterns in active use. |
| Agent Skills | planned next | Agent capability packaging | Sprint onboarding target for versioned reusable planner skills. |
| LangGraph & CrewAI | planned next | Orchestration | Start with LangGraph baseline flow; defer CrewAI unless role-based delegation becomes necessary. |
| Arize Phoenix | planned next | Evaluation lab | Add non-prod prompt/tool trace diagnostics lane. |
| Apache DataFusion | planned next | Rust analytics services | Stage embedded query path for higher-volume scenario analytics. |
| Qdrant | planned next | Retrieval | Stand up single-tenant collection and metadata filter schema. |
| vLLM | planned next | Shared inference | Introduce staging inference backend for concurrent agent workloads. |
| Wasmtime | planned next | Sandbox runtime | Define plugin ABI and first policy-check module proof of concept. |
| Qiskit | planned next | Scenario modeling | Add quantum-risk scenario notebook set and assumptions pack. |

## Onboarding sequence (next 2 sprints)

### Sprint 1 (Weeks 1-2): lock P0 delivery and CI guardrails

1. Finalize tool ownership:
   - Assign DRI per lane: `core simulation`, `agent tooling`, `observability`, `data`, `inference`, `cache/state`.
2. Complete CI enforcement for active P0 tools:
   - Enforce OpenAPI schema validation on pull requests.
   - Enforce OpenTelemetry instrumentation smoke checks in CI.
3. Baseline implementation hardening:
   - Confirm liboqs adapter coverage for selected algorithms.
   - Confirm Redis TTL/bounded-key policy checks.
   - Confirm DuckDB/Arrow/Ollama developer workflows documented in runbooks.
4. Exit criteria:
   - All `implemented now` tools have passing CI checks and runbook links.
   - `configured in CI` checks are blocking on main branch merges.

### Sprint 2 (Weeks 3-4): start P1 onboarding with measurable milestones

1. Orchestration and retrieval bootstrap:
   - Land LangGraph baseline planner flow behind feature flag.
   - Deploy Qdrant with initial collection schema + metadata filters.
2. Shared inference and observability expansion:
   - Stand up vLLM staging endpoint with concurrency/load smoke test.
   - Add Arize Phoenix in evaluation environment and capture first trace set.
3. Analytics/runtime extension pilots:
   - Add one DataFusion-backed analytic path for a high-volume scenario query.
   - Define Wasmtime plugin ABI and run one sandboxed policy-check prototype.
4. Scenario-science enablement:
   - Add initial Qiskit scenario package for threat-model assumption validation.
5. Exit criteria:
   - At least 4 `planned next` tools promoted to either `implemented now` or `configured in CI`.
   - Remaining `planned next` tools have named blockers and target sprint assignment.

## Implementation sequence (actionable)

1. `P0` foundation: PQC libraries, MCP + OpenAPI tool contracts, OpenTelemetry, DuckDB + Arrow, Redis, Ollama.
2. `P1` capability expansion: Qdrant, LangGraph orchestration, vLLM shared serving, DataFusion services, Wasmtime plugin sandbox, Qiskit scenario modeling, Phoenix observability lab.
3. `P2` decision gates: Iceberg/Polaris/Gravitino, Trino federation, advanced vector alternatives, ZK attestation stack, CUDA-Q, Teaclave/Tetragon, Dragonfly benchmark, SaaS eval platforms.

## Deferred review checkpoints

- Revisit all `P2 Deferred` items at end of each major release cycle or when one trigger occurs:
  - data volume growth exceeds DuckDB/local analytics envelope,
  - enterprise governance mandates catalog/federation,
  - compliance requires verifiable computation,
  - model-serving concurrency exceeds current throughput targets.
