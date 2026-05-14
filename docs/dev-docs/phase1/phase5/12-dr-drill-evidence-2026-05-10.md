# Phase 5 DR Drill Evidence Log (Executed)

## 1) Drill definition
- Drill ID: `DR-20260510-local-compose-service-loss-go-services`
- Environment: `local-compose`
- Facilitator: `Codex Worker 1`
- Scribe: `Codex Worker 1`
- Date/time (start): `2026-05-10 14:53:59 CST`
- Date/time (end): `2026-05-10 14:54:24 CST`
- Scenario:
  - `service-loss` (executed)
  - `data-restore` (not in this run)

## 2) RTO/RPO targets used
| Critical path | Service(s) | RTO target | RPO target | Notes |
|---|---|---:|---:|---|
| Gateway ingress | `nginx`, `gateway` | 15 min | 0 min | API availability path |
| Discovery flow | `discovery` + gateway | 20 min | 0 min | Stateless service path |
| Risk/proof flow | `python`, `rust-risk`, gateway | 20 min | 0 min | Stateless computation path |
| DB-backed governance data | `postgres`, `gateway` | 30 min | 15 min | Not exercised in this run |

## 3) Pre-drill checks
1. `bash scripts/validate-local-certs-script.sh` -> pass
2. Stack bootstrap was run by drill helper via `docker compose -f docker-compose.microservices.yml up -d --build`
3. Commit SHA recorded: `88ce565`

## 4) Executed procedure
1. Start local stack and verify baseline `GET http://localhost:8080/health = 200`.
2. Inject service loss: `docker compose -f docker-compose.microservices.yml stop go-services`.
3. Detect outage on probe path `/health` (observed degraded status `000`).
4. Recover service: `docker compose -f docker-compose.microservices.yml start go-services`.
5. Confirm restored status `GET /health = 200`.

## 5) Evidence log

### Metadata
- Participants: `Codex Worker 1`
- Incident comms channel/log link: `tests/integration/artifacts/dr-drill/20260510_145359/drill.log`

### Timings
| Event | Timestamp | Delta (min) |
|---|---|---:|
| Fault injected | 2026-05-10 14:54:23 CST | 0.00 |
| Fault detected | 2026-05-10 14:54:23 CST | 0.00 |
| Recovery started | 2026-05-10 14:54:24 CST | 0.02 |
| Service restored | 2026-05-10 14:54:24 CST | 0.02 |
| Smoke/tests checkpoint | 2026-05-10 14:54:24 CST | 0.02 |

Reference from summary artifact:
- `detect_after_fault = 0s`
- `restore_after_recovery_start = 0s`
- `drill_total = 25s`

### Outcome vs targets
| Critical path | Target RTO | Actual RTO | Pass/Fail | Target RPO | Actual RPO | Pass/Fail |
|---|---:|---:|---|---:|---:|---|
| Gateway ingress | 15 min | 0.02 min | Pass | 0 min | 0 min (stateless) | Pass |
| Discovery flow | 20 min | 0.02 min | Pass | 0 min | 0 min (stateless) | Pass |
| Risk/proof flow | 20 min | Not directly exercised | N/A | 0 min | N/A | N/A |
| DB-backed governance data | 30 min | Not exercised | N/A | 15 min | Not exercised | N/A |

### Command output references
- Drill helper: `tests/integration/dr_drill_local.sh`
- Summary JSON: `tests/integration/artifacts/dr-drill/20260510_145359/summary.json`
- Full command/log transcript: `tests/integration/artifacts/dr-drill/20260510_145359/drill.log`

### Findings and actions
| Finding | Severity | Owner | Due date | Status |
|---|---|---|---|---|
| Initial strict degraded-status assumption (`502` only) was too narrow for local probe behavior; helper now treats representative degraded outcomes (`000/5xx`). | Medium | Platform Eng | 2026-05-12 | Open |
| This drill covered service-loss/restore only; DB restore path remains to be executed and evidenced separately. | Medium | Platform Eng | 2026-05-14 | Open |

## 6) Exit criteria check
- RTO/RPO results recorded for exercised path: yes.
- Failed targets requiring owner/due date: none for exercised path.
- Evidence artifacts archived and linked: yes.
