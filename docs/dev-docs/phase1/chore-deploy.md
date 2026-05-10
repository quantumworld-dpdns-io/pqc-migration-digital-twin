┌─────────────────┬──────────────────────┬───────────────────────────────────┐
  │    Component    │        Status        │               Notes               │
  ├─────────────────┼──────────────────────┼───────────────────────────────────┤
  │ nginx           │ Public entry point ✓ │ Routes all traffic to go-services │
  ├─────────────────┼──────────────────────┼───────────────────────────────────┤
  │ go-services     │ Project-internal ✓   │ Gateway + Discovery on 8080/8081  │
  ├─────────────────┼──────────────────────┼───────────────────────────────────┤
  │ python-services │ Project-internal ✓   │ Analysis + QASM on 8082/8084      │
  ├─────────────────┼──────────────────────┼───────────────────────────────────┤
  │ rust-risk       │ Project-internal ✓   │ Risk engine on 8083               │
  └─────────────────┴──────────────────────┴───────────────────────────────────┘

  One thing missing: go-services needs to know the URLs of python-services and rust-risk. In Choreo UI, set these as environment variables on the go-services component:

  Go to go-services → DevOps → Configs & Secrets → Add (as environment variables):
  PYTHON_BASE_URL = http://python-services:8082
  RUST_BASE_URL   = http://rust-risk:8083
  QASM_BASE_URL   = http://python-services:8084
  
  ---
  How to test — smoke test against the live URL:

  GATEWAY_BASE_URL="https://baedb35c-04cc-4166-887d-a16b2b56924b-dev.e1-eu-north-azure.choreoapis.dev/pqc-migration-digital-twi/nginx/v1.0" \
    bash tests/integration/docker_microservices_smoke.sh

  Or test individual endpoints manually:

  BASE="https://baedb35c-04cc-4166-887d-a16b2b56924b-dev.e1-eu-north-azure.choreoapis.dev/pqc-migration-digital-twi/nginx/v1.0"

  # Health check (nginx → go-services)
  curl -fsS "$BASE/health"

  # Discovery scan
  curl -fsS -X POST "$BASE/api/v1/discovery" \
    -H 'content-type: application/json' \
    -d '{"address":"example.com","port":443}'

  # Asset list
  curl -fsS "$BASE/api/v1/assets"

  # Risk score
  curl -fsS -X POST "$BASE/api/v1/risk" \
    -H 'content-type: application/json' \
    -d '{"total_assets":100,"quantum_vulnerable_assets":40}'

  # ZK proof
  curl -fsS -X POST "$BASE/api/v1/proof" \
    -H 'content-type: application/json' \
    -d '{"credit_score":720,"debt_to_income_bps":3500,"late_payments":1,"existing_loans":2}'

  # QASM circuit
  curl -fsS -X POST "$BASE/api/v1/qasm" \
    -H 'content-type: application/json' \
    -d '{}'

  ---