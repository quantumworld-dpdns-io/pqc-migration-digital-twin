# Phase 5 Fault-Injection Playbook (Concise)

Purpose: provide a deterministic, CI-friendly playbook for validating dependency outage behavior and recovery using existing integration scripts.

## Scope
- In scope: local Docker Compose stack driven by existing scripts.
- Out of scope: service code changes, production fault injection, chaos tooling.

## Primary scripts
- Baseline smoke: `tests/integration/docker_microservices_smoke.sh`
- Resilience outage/recovery: `tests/integration/docker_resilience_smoke.sh`
- Resilience summary helper: `tests/integration/resilience_summary.sh`

## Preconditions
1. Docker engine available.
2. `docker compose` available.
3. `curl` available.
4. Local run target: `GATEWAY_BASE_URL` unset or `http://localhost:8080`.

## Standard execution flow
1. Run baseline smoke and capture transcript.
```bash
bash tests/integration/docker_microservices_smoke.sh | tee /tmp/smoke.log
```
2. Run resilience outage/recovery scenario and capture transcript.
```bash
bash tests/integration/docker_resilience_smoke.sh | tee /tmp/resilience.log
```
3. Produce deterministic JSON evidence summary.
```bash
bash tests/integration/resilience_summary.sh /tmp/resilience.log > /tmp/resilience-summary.json
```

## Expected resilience assertions
- Gateway health remains available during dependency outage.
- Risk endpoint returns degraded status (`502`) while `rust-risk` is stopped.
- Risk endpoint recovers to success (`200`) after `rust-risk` restart.

## CI usage pattern
- Keep raw script output as build logs/artifacts.
- Publish summary JSON artifact from `resilience_summary.sh`.
- Treat missing expected milestones as a failing condition.

## Evidence artifacts to retain per release
- Smoke transcript (`smoke.log`).
- Resilience transcript (`resilience.log`).
- Deterministic summary (`resilience-summary.json`).
