#!/usr/bin/env bash
set -euo pipefail

compose_file="docker-compose.microservices.yml"
base_url="${GATEWAY_BASE_URL:-http://localhost:8080}"
target_service="${DR_TARGET_SERVICE:-rust-risk}"
run_id="${DR_RUN_ID:-$(date '+%Y%m%d_%H%M%S')}"
artifact_dir="tests/integration/artifacts/dr-drill/${run_id}"
log_file="${artifact_dir}/drill.log"
summary_json="${artifact_dir}/summary.json"

mkdir -p "${artifact_dir}"

log() {
  local msg="$1"
  local ts
  ts="$(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "[dr-drill] ${ts} ${msg}" | tee -a "${log_file}"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "missing required command: $1"
    exit 1
  fi
}

require_cmd docker
require_cmd curl
require_cmd python3

if [ "${base_url}" != "http://localhost:8080" ]; then
  log "local drill only; refusing remote base_url=${base_url}"
  exit 0
fi

wait_http_ok() {
  local url="$1"
  local attempts="${2:-60}"
  local sleep_s="${3:-2}"
  for _ in $(seq 1 "${attempts}"); do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${sleep_s}"
  done
  return 1
}

post_risk_status() {
  curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${base_url}/api/v1/risk" \
    -H 'content-type: application/json' \
    -d '{"total_assets":100,"quantum_vulnerable_assets":40}' || true
}

cleanup() {
  docker compose -f "${compose_file}" down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

t_start_epoch="$(date +%s)"
t_start_human="$(date '+%Y-%m-%d %H:%M:%S %Z')"

log "run_id=${run_id}"
log "starting docker stack"
docker compose -f "${compose_file}" up -d --build >>"${log_file}" 2>&1

if ! wait_http_ok "${base_url}/health" 90 2; then
  log "gateway health did not become ready"
  exit 1
fi
log "gateway health ready"

baseline_status="$(post_risk_status)"
if [ "${baseline_status}" != "200" ]; then
  log "baseline risk status unexpected: ${baseline_status}"
  exit 1
fi
log "baseline risk status=200"

t_fault_epoch="$(date +%s)"
t_fault_human="$(date '+%Y-%m-%d %H:%M:%S %Z')"
log "injecting fault: stopping ${target_service}"
docker compose -f "${compose_file}" stop "${target_service}" >>"${log_file}" 2>&1

t_detect_epoch=""
t_detect_human=""
for _ in $(seq 1 40); do
  status="$(post_risk_status)"
  if [ "${status}" = "502" ]; then
    t_detect_epoch="$(date +%s)"
    t_detect_human="$(date '+%Y-%m-%d %H:%M:%S %Z')"
    log "fault detected via risk status=502"
    break
  fi
  sleep 1
done
if [ -z "${t_detect_epoch}" ]; then
  log "fault detect failed: no 502 observed"
  exit 1
fi

t_recover_start_epoch="$(date +%s)"
t_recover_start_human="$(date '+%Y-%m-%d %H:%M:%S %Z')"
log "recovery start: starting ${target_service}"
docker compose -f "${compose_file}" start "${target_service}" >>"${log_file}" 2>&1

if ! wait_http_ok "http://localhost:8083/health" 60 1; then
  log "target service health did not recover"
  exit 1
fi

t_restored_epoch=""
t_restored_human=""
for _ in $(seq 1 60); do
  status="$(post_risk_status)"
  if [ "${status}" = "200" ]; then
    t_restored_epoch="$(date +%s)"
    t_restored_human="$(date '+%Y-%m-%d %H:%M:%S %Z')"
    log "service restored via risk status=200"
    break
  fi
  sleep 1
done
if [ -z "${t_restored_epoch}" ]; then
  log "restore failed: risk status did not recover to 200"
  exit 1
fi

log "running smoke validation"
smoke_output="$(bash tests/integration/docker_microservices_smoke.sh 2>&1 || true)"
echo "${smoke_output}" >>"${log_file}"
t_smoke_epoch="$(date +%s)"
t_smoke_human="$(date '+%Y-%m-%d %H:%M:%S %Z')"
if printf "%s" "${smoke_output}" | rg -q "Smoke test passed"; then
  smoke_pass="true"
  log "smoke validation passed"
else
  smoke_pass="false"
  log "smoke validation failed"
fi

t_end_epoch="$(date +%s)"
t_end_human="$(date '+%Y-%m-%d %H:%M:%S %Z')"

python3 - <<PY
import json
from pathlib import Path

summary = {
  "run_id": "${run_id}",
  "base_url": "${base_url}",
  "target_service": "${target_service}",
  "timestamps": {
    "start": {"human": "${t_start_human}", "epoch": int("${t_start_epoch}")},
    "fault_injected": {"human": "${t_fault_human}", "epoch": int("${t_fault_epoch}")},
    "fault_detected": {"human": "${t_detect_human}", "epoch": int("${t_detect_epoch}")},
    "recovery_started": {"human": "${t_recover_start_human}", "epoch": int("${t_recover_start_epoch}")},
    "service_restored": {"human": "${t_restored_human}", "epoch": int("${t_restored_epoch}")},
    "smoke_checked": {"human": "${t_smoke_human}", "epoch": int("${t_smoke_epoch}")},
    "end": {"human": "${t_end_human}", "epoch": int("${t_end_epoch}")},
  },
  "deltas_sec": {
    "detect_after_fault": int("${t_detect_epoch}") - int("${t_fault_epoch}"),
    "restore_after_recovery_start": int("${t_restored_epoch}") - int("${t_recover_start_epoch}"),
    "drill_total": int("${t_end_epoch}") - int("${t_start_epoch}"),
  },
  "checks": {
    "baseline_risk_200": True,
    "degraded_risk_502": True,
    "restored_risk_200": True,
    "smoke_pass": ${smoke_pass},
  },
}
Path("${summary_json}").write_text(json.dumps(summary, indent=2), encoding="utf-8")
PY

log "summary written: ${summary_json}"
log "drill completed"
