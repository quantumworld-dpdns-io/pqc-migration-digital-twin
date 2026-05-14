#!/usr/bin/env bash
set -euo pipefail

compose_file="docker-compose.microservices.yml"

# Override BASE_URL to point at a remote deployment, e.g. Choreo nginx URL.
# Set CHOREO_TOKEN for Bearer auth when testing against Choreo.
# Example:
#   GATEWAY_BASE_URL=https://<choreo-nginx-url> CHOREO_TOKEN=<token> bash tests/integration/docker_microservices_smoke.sh
BASE_URL="${GATEWAY_BASE_URL:-http://localhost:8080}"
IS_LOCAL=$( [ "$BASE_URL" = "http://localhost:8080" ] && echo "true" || echo "false" )

AUTH_HEADER=""
if [ -n "${CHOREO_TOKEN:-}" ]; then
  AUTH_HEADER="Authorization: Bearer $CHOREO_TOKEN"
fi

curl_cmd() {
  if [ -n "$AUTH_HEADER" ]; then
    curl -fsS -H "$AUTH_HEADER" "$@"
  else
    curl -fsS "$@"
  fi
}

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

curl_cmd -X POST "${BASE_URL}/api/v1/discovery" -H 'content-type: application/json' -d '{"address":"example.com","port":443}' >/dev/null
curl_cmd "${BASE_URL}/api/v1/assets" >/dev/null
curl_cmd -X POST "${BASE_URL}/api/v1/risk" -H 'content-type: application/json' -d '{"total_assets":100,"quantum_vulnerable_assets":40}' >/dev/null
curl_cmd -X POST "${BASE_URL}/api/v1/risk/backlog" -H 'content-type: application/json' -d '{"policy":"balanced","asset_rows":[{"asset_id":"asset-a","total_assets":100,"quantum_vulnerable_assets":65},{"asset_id":"asset-b","total_assets":100,"quantum_vulnerable_assets":20}]}' >/dev/null
curl_cmd -X POST "${BASE_URL}/api/v1/proof" -H 'content-type: application/json' -d '{"credit_score":720,"debt_to_income_bps":3500,"late_payments":1,"existing_loans":2}' >/dev/null
curl_cmd -X POST "${BASE_URL}/api/v1/qasm" -H 'content-type: application/json' -d '{}' >/dev/null

echo "Smoke test passed against: $BASE_URL"
