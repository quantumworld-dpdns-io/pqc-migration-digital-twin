# Phase 5 SLO and Error-Budget Specification

Purpose: define measurable reliability targets for critical paths in this repository and a practical error-budget policy for release decisions.

## Scope and measurement source
- In scope services: `gateway`, `python-analysis` (HNDL scoring + proof), `rust-risk`.
- Primary observation points:
  - Gateway endpoints: `src/go/gateway/server.go`
  - Service metrics endpoints: `/metrics` in Go/Python/Rust/QASM services
  - CI/integration probes: `tests/integration/docker_microservices_smoke.sh`, `tests/integration/docker_resilience_smoke.sh`
- Measurement window: rolling 30 days.

## SLO targets

| SLI (what is measured) | Endpoint / path | Target | Notes |
|---|---|---:|---|
| Availability (success ratio) | `POST /api/v1/risk` (gateway) | >= 99.5% / 30d | Core risk decision path |
| Availability (success ratio) | `POST /api/v1/proof` (gateway -> HNDL) | >= 99.5% / 30d | Proof generation path |
| Availability (success ratio) | `POST /hndl/score` (python-analysis) | >= 99.0% / 30d | Internal scoring path |
| Availability (success ratio) | `POST /score` (rust-risk) | >= 99.0% / 30d | Internal risk engine path |
| Latency p95 | `POST /api/v1/risk` | <= 500 ms | Gateway-observed end-to-end |
| Latency p95 | `POST /api/v1/proof` | <= 700 ms | Includes HNDL/proof processing |
| Latency p95 | `POST /hndl/score` | <= 400 ms | Service-local target |
| Latency p95 | `POST /score` | <= 300 ms | Service-local target |

## Error budgets (30-day)
- For 99.5% SLO: allowed failure = `0.5%` (216 minutes unavailable equivalent).
- For 99.0% SLO: allowed failure = `1.0%` (432 minutes unavailable equivalent).

## Budget policy
- `Healthy` (remaining budget > 50%): normal feature release cadence.
- `At risk` (remaining budget 25% to 50%): require reliability review in release notes.
- `Critical` (remaining budget < 25%): freeze non-reliability changes.
- `Exhausted` (remaining budget <= 0): release only incident fixes and recovery work.

## Calculation guidance (repo-grounded)
- Success ratio baseline from RED metrics:
  - `request_count`
  - `error_count`
- Formula:
  - `availability = 1 - (error_count / request_count)`
- Latency baseline from RED metrics:
  - `latency_ms_sum`, `latency_ms_count`, `latency_ms_max`
- For p95/p99 readiness, add histogram-based export in next increment where needed.

## Evidence required per release
- CI run URL showing green:
  - `integration-docker`
  - `integration-resilience`
- Metrics snapshot (gateway + python + rust) captured at release SHA.
- Any budget exceptions approved in go/no-go record.

## Review cadence
- Weekly reliability review.
- Mandatory review before production cut.
