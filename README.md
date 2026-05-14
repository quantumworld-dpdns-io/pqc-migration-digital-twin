# PQC Migration Digital Twin

Post-quantum cryptography migration planner for enterprise estates.
The platform inventories certificates, TLS/SSH/VPN keys, and harvest-now-decrypt-later (HNDL) exposure, then prioritizes remediation with risk scoring and zero-knowledge migration proofs.

---

<img width="1267" height="859" alt="Screenshot 2026-05-09 at 10 50 40 AM" src="https://github.com/user-attachments/assets/c2980034-aaf4-4c41-9d4d-88c9c626c0a6" />

---

## Vision

Enable security and platform teams to migrate cryptographic infrastructure to PQC with evidence, not guesswork:

Full cryptographic asset visibility across heterogeneous systems.

Quantified migration risk and business impact.

Verifiable migration attestations that preserve sensitive operational data.

## Core Capabilities

- Discovery and inventory of `x509`, TLS, SSH, VPN, and related key material.
- HNDL exposure mapping across data flows, retention windows, and threat horizons.
- Risk scoring engine combining crypto strength, exposure duration, blast radius, and operational criticality.
- Migration planning assistant with phased recommendations and dependency-aware sequencing.
- Zero-knowledge proof pipeline for migration evidence (prove compliance without disclosing private key material or sensitive topology).
- Dashboard UX direction inspired by IBM Quantum Composer aesthetics: structured, technical, high-signal visual language.

## Architecture At A Glance

- `Ingest layer` (Go): high-throughput collectors, scanners, protocol adapters, and orchestration APIs.
- `Risk and proof core` (Rust): deterministic risk models, policy evaluation, proof generation/verification.
- `Analysis and simulation` (Python + QASM): migration scenario simulation, cryptographic transition experiments, and quantum-risk modeling.
- `Control plane UI` (Next.js): planner workflow, asset/risk visualization, and evidence presentation.
- `Shared data contracts`: canonical asset, exposure, and proof schemas across services.

## Tech Stack Rationale

- `Go`: efficient network/service discovery and operational tooling with fast startup and simple deployment.
- `Rust`: memory-safe, high-assurance implementation for security-critical scoring and proof logic.
- `Python`: rapid modeling and simulation workflows for risk experimentation and reporting.
- `QASM`: explicit quantum workflow representation for reproducible threat and algorithm-transition experiments.
- `Next.js`: production-ready frontend and API routes for operator-centric planning interfaces.

## Repository Structure (Planned)

This repository is currently in scaffold stage; expected structure:

```text
.
├── src/                     # Core services and shared modules
│   ├── go/                  # Discovery/ingest services
│   ├── rust/                # Risk/proof engines
│   ├── python/              # Simulation and analytics
│   ├── qasm/                # Quantum experiment assets
│   └── web/                 # Next.js planner UI
├── docs/                    # ADRs, architecture, runbooks, contributor docs
├── dev-docs/                # Implementation plans, sprint specs, execution notes
├── tests/                   # Unit/integration/e2e/security tests
└── .github/workflows/       # CI/CD and quality gates
```

## Setup

```bash
git clone https://github.com/quantumworld-dpdns-io/pqc-migration-digital-twin.git
cd pqc-migration-digital-twin
```

Planned local prerequisites:

- `Go` (for ingest services)
- `Rust` (for risk/proof engine)
- `Python 3.11+` (for modeling/simulation)
- `Node.js 20+` (for Next.js frontend)

## Run Targets

Current state: foundational scaffold.Planned standard targets (via `Makefile`/task runner):

- `make bootstrap`: install toolchains and local dependencies.
- `make dev`: run API/services/frontend in local dev mode.
- `make test`: run unit and integration suites across languages.
- `make lint`: run formatting, linting, and static analysis checks.
- `make risk-sim`: execute migration risk simulation scenarios.
- `make proof-demo`: generate and verify sample migration proofs.
- `make docker-build`: build all microservice images.
- `make docker-up`: run Docker-based microservices (`go`, `python`, `rust`, `qasm`).
- `make docker-down`: stop Docker microservices.

## Docker Microservices

The following components are Docker-based microservices:

- `src/go/gateway` on port `8080`
- `src/go/discovery` on port `8081`
- `src/python` on port `8082`
- `src/rust` (`risk-service`) on port `8083`
- `src/qasm/examples` on port `8084`

Use:

```bash
make docker-build
make docker-up
```

Then sample health checks:

```bash
curl -s http://localhost:8080/health
curl -s http://localhost:8081/health
curl -s http://localhost:8082/health
curl -s http://localhost:8083/health
curl -s http://localhost:8084/health
```

## Practical Phased Build Overview

- `Phase 0 - Foundation`: repository conventions, schemas, CI baseline, contributor workflow.
- `Phase 1 - Discovery MVP`: certificate/key inventory, protocol connectors, baseline asset graph.
- `Phase 2 - Risk Intelligence`: HNDL mapping, scoring models, prioritization engine.
- `Phase 3 - Proofs and Attestations`: zero-knowledge migration proof generation and verifier APIs.
- `Phase 4 - Planner UX`: operator dashboard, migration playbooks, approval and audit workflows.
- `Phase 5 - Production Hardening`: scale, policy packs, observability, and compliance integrations.

Planning artifacts:

- `docs/` for architecture decisions and long-lived references.
- `dev-docs/` for implementation plans, milestones, and execution checklists.

## Roadmap Summary

- Short term: inventory fidelity, schema stability, and deterministic scoring baseline.
- Mid term: robust migration orchestration with proof-backed compliance evidence.
- Long term: continuous crypto posture management and automated PQC policy enforcement.

## Security And Privacy Principles

- Least-privilege collection and scoped credentials.
- Data minimization by default; collect only what is required for migration decisions.
- Cryptographic attestations over sensitive raw disclosure where possible.
- Tamper-evident audit trails for planning and migration actions.
- Reproducible risk/proof computation with testable, versioned models.

## Contribution Notes

- Use small, focused pull requests with clear security and migration impact notes.
- Keep cross-language contracts explicit and versioned.
- Include tests for any change that affects discovery accuracy, risk scores, or proof validity.
- Read [Contributing Guide](docs/CONTRIBUTING.md) before opening a PR.

## License

[MIT](LICENSE)
