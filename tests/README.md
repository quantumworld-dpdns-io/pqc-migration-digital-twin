# Tests Scaffold

This directory contains repository quality gates and cross-service validation assets.

## Python test frameworks (no pytest)

- `tests/doctest/`: doctest-based repository contract checks.
- `tests/behave/`: BDD scenarios for API behavior (including negative API cases).
- `tests/robot/`: Robot Framework API checks (including negative API cases).
- `tests/locust/`: Locust headless API load/smoke checks (including negative API cases).
- `tests/contracts/`: legacy contract checks retained for reference (not executed by default test targets).

## Negative API coverage added

- Unsupported method on risk endpoint: `GET /api/v1/risk` expects `405`.
- Malformed JSON payload on risk endpoint: `POST /api/v1/risk` expects `400`.

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
