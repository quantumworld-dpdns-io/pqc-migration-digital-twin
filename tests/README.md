# Tests Scaffold

This directory contains repository quality gates and cross-service validation assets.

## Python test frameworks (no pytest)

- `tests/doctest/`: doctest-based repository contract checks.
- `tests/behave/`: BDD scenarios for API behavior (including negative API cases).
- `tests/robot/`: Robot Framework API checks (including negative API cases).
- `tests/locust/`: Locust headless API load/smoke checks (including negative API cases).
- `tests/perf/`: deterministic benchmark profiles for reproducible load runs.
- `tests/contracts/`: legacy contract checks retained for reference (not executed by default test targets).

## Negative API coverage added

- Unsupported method on risk endpoint: `GET /api/v1/risk` expects `405`.
- Malformed JSON payload on governance exceptions endpoint: `POST /api/v1/governance/exceptions` expects `400`.
- Invalid audit limit: `GET /api/v1/audit/events?limit=-1` expects `400`.
- Missing required governance fields: `POST /api/v1/governance/exceptions` with empty `asset_id/reason/owner` expects `400`.
- Unsupported governance method: `DELETE /api/v1/governance/exceptions` expects `405`.

## Running

- `make contracts`: runs doctest contract suite.
- `make test`: runs Go/Rust/Web + Python suites with this order:
  - doctest always
  - Behave if installed and `GATEWAY_BASE_URL` is set
  - Robot if installed and `GATEWAY_BASE_URL` is set
  - Locust if installed and `GATEWAY_BASE_URL` is set

Example:

```bash
GATEWAY_BASE_URL=http://localhost:8080 make test
```

## 10k asset-equivalent benchmark

- Runner: `scripts/run-benchmark-10k.sh`
- Profile defaults: `tests/perf/benchmark_10k.env`
- Locust scenario: `tests/locust/benchmark_10k_locustfile.py`
- Machine-readable summary artifact: `tests/integration/artifacts/benchmark-10k/<RUN_ID>/summary.json`

Example:

```bash
bash scripts/run-benchmark-10k.sh
```
