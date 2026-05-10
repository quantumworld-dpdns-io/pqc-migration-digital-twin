# Phase 5 DR Drill Template and Evidence Log

Use this template to run and record a disaster recovery drill for this repo.

## 1) Drill definition
- Drill ID: `DR-YYYYMMDD-<env>-<scenario>`
- Environment: `local-compose` or `<remote-env>`
- Facilitator:
- Scribe:
- Date/time (start):
- Date/time (end):
- Scenario:
  - `service-loss` (required)
  - `data-restore` (required for stateful path)

## 2) RTO/RPO targets (document before execution)
| Critical path | Service(s) | RTO target | RPO target | Notes |
|---|---|---:|---:|---|
| Gateway ingress | `nginx`, `gateway` | 15 min | 0 min | API availability path |
| Discovery flow | `discovery` + gateway | 20 min | 0 min | Stateless service path |
| Risk/proof flow | `python`, `rust-risk`, gateway | 20 min | 0 min | Stateless computation path |
| DB-backed governance data | `postgres`, `gateway` | 30 min | 15 min | Based on backup cadence |

## 3) Pre-drill checks
1. `bash scripts/validate-local-certs-script.sh`
2. `make docker-up`
3. `make docker-smoke`
4. Record current commit SHA:
- `git rev-parse --short HEAD`

## 4) Execution procedure

### Phase A: Service-loss simulation
1. Stop target service.
- `docker compose -f docker-compose.microservices.yml stop <service-name>`
2. Measure outage detection time (`T_detect`).
3. Attempt recovery.
- `docker compose -f docker-compose.microservices.yml up -d <service-name>`
4. Run endpoint probe and smoke.
- `make docker-smoke`

### Phase B: Data-restore simulation (if stateful path in scope)
1. Stop stack.
- `make docker-down`
2. Restore from chosen backup snapshot/process.
- Document exact restore command/process used.
3. Restart and validate.
- `make docker-up`
- `make docker-smoke`

## 5) Evidence log (fill during drill)

### Metadata
- Commit SHA:
- Participants:
- Incident comms channel/log link:

### Timings
| Event | Timestamp | Delta (min) |
|---|---|---:|
| Fault injected |  |  |
| Fault detected |  |  |
| Recovery started |  |  |
| Service restored |  |  |
| Smoke tests passed |  |  |

### Outcome vs targets
| Critical path | Target RTO | Actual RTO | Pass/Fail | Target RPO | Actual RPO | Pass/Fail |
|---|---:|---:|---|---:|---:|---|
| Gateway ingress |  |  |  |  |  |  |
| Discovery flow |  |  |  |  |  |  |
| Risk/proof flow |  |  |  |  |  |  |
| DB-backed governance data |  |  |  |  |  |  |

### Command output references
- Startup logs:
- Recovery logs:
- Smoke output:
- Contract test output:

### Findings and actions
| Finding | Severity | Owner | Due date | Status |
|---|---|---|---|---|
|  |  |  |  |  |

## 6) Exit criteria
- RTO and RPO results are explicitly recorded.
- Any failed target has an owner and due date.
- Evidence artifacts are archived with this file and linked in release readiness docs.
