#!/usr/bin/env bash
set -euo pipefail

compose_file="docker-compose.microservices.yml"

cleanup() {
  docker compose -f "$compose_file" down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker compose -f "$compose_file" up -d --build

echo "Waiting for health endpoints..."
for i in {1..30}; do
  if curl -fsS http://localhost:8080/health >/dev/null \
    && curl -fsS http://localhost:8081/health >/dev/null \
    && curl -fsS http://localhost:8082/health >/dev/null \
    && curl -fsS http://localhost:8083/health >/dev/null \
    && curl -fsS http://localhost:8084/health >/dev/null; then
    break
  fi
  sleep 2
done

curl -fsS -X POST http://localhost:8080/api/v1/discovery -H 'content-type: application/json' -d '{"address":"example.com","port":443}' >/dev/null
curl -fsS -X POST http://localhost:8080/api/v1/risk -H 'content-type: application/json' -d '{"total_assets":100,"quantum_vulnerable_assets":40}' >/dev/null
curl -fsS -X POST http://localhost:8080/api/v1/proof -H 'content-type: application/json' -d '{"credit_score":720,"debt_to_income_bps":3500,"late_payments":1,"existing_loans":2}' >/dev/null
curl -fsS -X POST http://localhost:8080/api/v1/qasm -H 'content-type: application/json' -d '{}' >/dev/null

echo "Docker microservices smoke test passed"
