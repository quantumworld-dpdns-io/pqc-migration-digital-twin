# Phase 5 RED Dashboard and Alert Baseline

Purpose: define a versioned baseline for RED dashboard panels and alert thresholds using currently implemented `/metrics` exports.

## Scope
- Services: `gateway`, `discovery`, `python-analysis`, `rust-risk`, `qasm-examples`.
- Metrics source: each service `/metrics` endpoint.
- Baseline status date: `2026-05-10`.

## Dashboard baseline (required panels)

| Panel ID | Service | Metric/derivation | Target/threshold | View |
|---|---|---|---|---|
| RED-1 | all | `request_count` delta per minute | track trend | Throughput |
| RED-2 | all | `error_count / request_count` | warn `> 1%` for 15m; critical `> 2%` for 15m | Error rate |
| RED-3 | all | `latency_ms_avg = latency_ms_sum / latency_ms_count` | warn `> 80%` of SLO p95 target; critical `> 100%` of SLO p95 target | Latency |
| RED-4 | all | `latency_ms_max` | warn `> 1.5x` p95 target; critical `> 2x` p95 target | Tail latency guardrail |
| RED-5 | gateway | `POST /api/v1/risk` availability approximation from RED counts | SLO target `>= 99.5%` | SLO rollup |
| RED-6 | gateway | `POST /api/v1/proof` availability approximation from RED counts | SLO target `>= 99.5%` | SLO rollup |
| RED-7 | python-analysis | `POST /hndl/score` availability approximation from RED counts | SLO target `>= 99.0%` | SLO rollup |
| RED-8 | rust-risk | `POST /score` availability approximation from RED counts | SLO target `>= 99.0%` | SLO rollup |

## Alert baseline (policy-ready rules)

| Alert ID | Condition | Severity | Action |
|---|---|---|---|
| ALT-RED-01 | error rate `> 2%` for 15m (any service) | critical | page on-call; freeze non-reliability deploys |
| ALT-RED-02 | error rate `> 1%` for 15m (any service) | warning | create incident ticket; owner triage within 30m |
| ALT-RED-03 | latency average above SLO target for 15m | warning | open reliability task, include impacted route |
| ALT-RED-04 | latency average above `120%` of SLO target for 15m | critical | incident response + rollback evaluation |
| ALT-RED-05 | gateway availability estimate `< 99.5%` over trailing 24h | warning | budget-at-risk review in release record |
| ALT-RED-06 | gateway availability estimate `< 99.0%` over trailing 24h | critical | stop feature release; recovery-only changes |

## Manual dashboard verification checklist
- [ ] Metrics scrape confirms non-zero `request_count` and `latency_ms_count` for each service.
- [ ] RED-1 to RED-8 panels render with current release SHA annotation.
- [ ] ALT-RED-01 to ALT-RED-06 rules are configured in the chosen monitor system.
- [ ] Link panel screenshots and alert snapshots into `06-release-evidence-pack-template.md`.

## Notes and limitations
- Current repository metrics baseline does not expose native percentile histograms for all services; latency guardrails are based on exported aggregate counters.
- This artifact defines thresholds and panel contracts; it does not claim runtime deployment or executed alert firing tests.
