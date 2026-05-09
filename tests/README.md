# Tests Scaffold

This directory contains test scaffolding for the repository quality gates defined in `docs/dev-docs/implementation-plan.md`.

## Current scope

- `tests/contracts/`: repository contract compatibility smoke tests (API/schema drift guardrails).

## Intended strategy

- Unit tests: language-local logic tests.
- Integration tests: service and dependency boundary checks.
- Contract tests: compatibility checks for versioned APIs/schemas.
- End-to-end tests: scan -> analyze -> score -> proof -> UI flow.

## Implemented contract smoke checks

- Gateway API surface contract:
  - Required endpoints in `src/go/gateway/server.go` (`/health` and `/api/v1/*` routes).
  - Required response payload keys used by downstream consumers.
- Rust workspace contract:
  - `src/rust/Cargo.toml` workspace members resolve to real crates.
  - `shared-contracts` exports core domain contract types (`ApplicantProfile`, `RiskScore`, `RiskBand`).
- Web package contract:
  - Required npm scripts (`dev`, `build`, `lint`) exist in `src/web/package.json`.
  - Required runtime dependencies (`next`, `react`, `react-dom`) are present.
