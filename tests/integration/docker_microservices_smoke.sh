#!/usr/bin/env bash
set -euo pipefail

compose_file="docker-compose.microservices.yml"

# BASE_URL: override to point at Choreo nginx URL for remote smoke tests
# Example: BASE_URL=https://<choreo-nginx-url> bash tests/integration/docker_microservices_smoke.sh
BASE_URL="${GATEWAY_BASE_URL:-http://localhost:8080}"
LOCAL_MODE="${BASE_URL#http://localhost}"
IS_LOCAL=$( [ "$BASE_URL" = "http://localhost:8080" ] && echo "true" || echo "false" )

cleanup() {
  if [ "$IS_LOCAL" = "true" ]; then
    docker compose -f "$compose_file" down -v >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [ "$IS_LOCAL" = "true" ]; then
  docker compose -f "$compose_file" up -d --build
  echo "Waiting for nginx health endpoint..."
  for i in {1..30}; do
    if curl -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
else
  echo "Remote smoke test against: $BASE_URL"
fi

curl -fsS -X POST "${BASE_URL}/api/v1/discovery" -H 'content-type: application/json' -d '{"address":"example.com","port":443}' >/dev/null
curl -fsS "${BASE_URL}/api/v1/assets" >/dev/null
curl -fsS -X POST "${BASE_URL}/api/v1/risk" -H 'content-type: application/json' -d '{"total_assets":100,"quantum_vulnerable_assets":40}' >/dev/null
curl -fsS -X POST "${BASE_URL}/api/v1/risk/backlog" -H 'content-type: application/json' -d '{"policy":"balanced","asset_rows":[{"asset_id":"asset-a","total_assets":100,"quantum_vulnerable_assets":65},{"asset_id":"asset-b","total_assets":100,"quantum_vulnerable_assets":20}]}' >/dev/null
curl -fsS -X POST "${BASE_URL}/api/v1/proof" -H 'content-type: application/json' -d '{"credit_score":720,"debt_to_income_bps":3500,"late_payments":1,"existing_loans":2}' >/dev/null
curl -fsS -X POST "${BASE_URL}/api/v1/qasm" -H 'content-type: application/json' -d '{}' >/dev/null

echo "Smoke test passed against: $BASE_URL"
