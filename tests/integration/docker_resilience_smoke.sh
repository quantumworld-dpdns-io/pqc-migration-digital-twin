#!/usr/bin/env bash
set -euo pipefail

compose_file="docker-compose.microservices.yml"
BASE_URL="${GATEWAY_BASE_URL:-http://localhost:8080}"
IS_LOCAL=$([ "$BASE_URL" = "http://localhost:8080" ] && echo "true" || echo "false")

if [ "$IS_LOCAL" != "true" ]; then
  echo "[integration-resilience] This test is local-compose only. BASE_URL=$BASE_URL"
  exit 0
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[integration-resilience] missing required command: $1"
    exit 1
  fi
}

require_cmd docker
require_cmd curl

wait_http_ok() {
  local url="$1"
  local label="$2"
  local attempts="${3:-60}"
  local sleep_s="${4:-2}"

  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "[integration-resilience] $label is healthy"
      return 0
    fi
    sleep "$sleep_s"
  done

  echo "[integration-resilience] timed out waiting for $label ($url)"
  return 1
}

expect_status() {
  local expected="$1"
  local url="$2"
  local method="${3:-GET}"
  local body="${4:-}"
  local attempts="${5:-25}"
  local sleep_s="${6:-2}"

  local got=""
  for _ in $(seq 1 "$attempts"); do
    if [ -n "$body" ]; then
      got="$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H 'content-type: application/json' -d "$body" || true)"
    else
      got="$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" || true)"
    fi

    if [ "$got" = "$expected" ]; then
      echo "[integration-resilience] status $expected confirmed for $method $url"
      return 0
    fi
    sleep "$sleep_s"
  done

  echo "[integration-resilience] expected $expected but got $got for $method $url"
  return 1
}

cleanup() {
  docker compose -f "$compose_file" down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[integration-resilience] Starting stack"
docker compose -f "$compose_file" up -d --build

wait_http_ok "${BASE_URL}/health" "nginx gateway"

# Baseline request should pass before fault injection.
expect_status "200" "${BASE_URL}/api/v1/risk" "POST" '{"total_assets":100,"quantum_vulnerable_assets":40}'

echo "[integration-resilience] Fault injection: stop rust-risk"
docker compose -f "$compose_file" stop rust-risk

# Gateway process should remain healthy while downstream risk service is unavailable.
wait_http_ok "${BASE_URL}/health" "nginx health during downstream outage" 20 1

# Risk path should surface degraded behavior via upstream failure status.
expect_status "502" "${BASE_URL}/api/v1/risk" "POST" '{"total_assets":100,"quantum_vulnerable_assets":40}' 30 1

echo "[integration-resilience] Restart rust-risk"
docker compose -f "$compose_file" start rust-risk

wait_http_ok "${BASE_URL}/health" "nginx gateway after restart"
wait_http_ok "http://localhost:8083/health" "rust-risk after restart"

# End-to-end path should recover to healthy status after restart.
expect_status "200" "${BASE_URL}/api/v1/risk" "POST" '{"total_assets":100,"quantum_vulnerable_assets":40}'

echo "[integration-resilience] Restart + degraded-path checks passed"
