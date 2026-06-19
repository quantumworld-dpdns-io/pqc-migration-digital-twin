#!/usr/bin/env bash
# Choreo deployment diagnostic — writes NDJSON to .cursor/debug-6ce024.log
set -euo pipefail

LOG_PATH="${DEBUG_LOG_PATH:-.cursor/debug-6ce024.log}"
SESSION_ID="${DEBUG_SESSION_ID:-6ce024}"
RUN_ID="${RUN_ID:-pre-fix}"
BASE_URL="${GATEWAY_BASE_URL:-${1:-}}"

mkdir -p "$(dirname "$LOG_PATH")"

log_event() {
  local hypothesis_id="$1"
  local location="$2"
  local message="$3"
  local data_json="$4"
  printf '%s\n' "{\"sessionId\":\"${SESSION_ID}\",\"runId\":\"${RUN_ID}\",\"hypothesisId\":\"${hypothesis_id}\",\"location\":\"${location}\",\"message\":\"${message}\",\"data\":${data_json},\"timestamp\":$(date +%s000)}" >> "$LOG_PATH"
}

if [[ -z "$BASE_URL" ]]; then
  log_event "H0" "choreo-diagnose.sh:main" "missing BASE_URL" "{\"hint\":\"Set GATEWAY_BASE_URL or pass nginx public URL as arg1\"}"
  echo "Usage: GATEWAY_BASE_URL=https://.../nginx/v1.0 bash scripts/choreo-diagnose.sh" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"
log_event "H0" "choreo-diagnose.sh:main" "diagnostic start" "{\"baseUrl\":\"${BASE_URL}\"}"

probe() {
  local path="$1"
  local method="${2:-GET}"
  local body="${3:-}"
  local hypothesis_id="${4:-H5}"
  local url="${BASE_URL}${path}"
  local start_ms end_ms elapsed_ms http_code body_snip curl_err

  start_ms=$(date +%s000)
  if [[ "$method" == "POST" && -n "$body" ]]; then
    response=$(curl -sS -m 15 -w "\n__HTTP_CODE__:%{http_code}" -X POST "$url" \
      -H 'content-type: application/json' -d "$body" 2>&1) || curl_err=$?
  else
    response=$(curl -sS -m 15 -w "\n__HTTP_CODE__:%{http_code}" "$url" 2>&1) || curl_err=$?
  fi
  end_ms=$(date +%s000)
  elapsed_ms=$((end_ms - start_ms))

  if [[ -n "${curl_err:-}" ]]; then
    log_event "$hypothesis_id" "choreo-diagnose.sh:probe" "curl failed" \
      "{\"path\":\"${path}\",\"method\":\"${method}\",\"elapsedMs\":${elapsed_ms},\"error\":\"timeout or connection refused\"}"
    echo "FAIL ${method} ${path} — connection error/timeout"
    return
  fi

  http_code="${response##*__HTTP_CODE__:}"
  body_snip=$(printf '%s' "${response%__HTTP_CODE__:*}" | head -c 200 | tr '\n' ' ')
  log_event "$hypothesis_id" "choreo-diagnose.sh:probe" "probe result" \
    "{\"path\":\"${path}\",\"method\":\"${method}\",\"httpCode\":${http_code},\"elapsedMs\":${elapsed_ms},\"bodySnippet\":\"${body_snip}\"}"

  if [[ "$http_code" =~ ^2 ]]; then
    echo "OK   ${method} ${path} — HTTP ${http_code} (${elapsed_ms}ms)"
  elif [[ "$http_code" == "502" || "$http_code" == "503" || "$http_code" == "504" ]]; then
    echo "FAIL ${method} ${path} — HTTP ${http_code} (nginx up, backend likely down/unreachable)"
  else
    echo "WARN ${method} ${path} — HTTP ${http_code}"
  fi
}

echo "Choreo diagnostic → ${LOG_PATH}"
echo "Target: ${BASE_URL}"
echo ""

probe "/health" GET "" "H6"
probe "/health/gateway" GET "" "H4"
probe "/api/v1/assets"
probe "/api/v1/risk" POST '{"total_assets":100,"quantum_vulnerable_assets":40}'
probe "/api/v1/proof" POST '{"credit_score":720,"debt_to_income_bps":3500,"late_payments":1,"existing_loans":2}'
probe "/api/v1/qasm" POST '{}'

log_event "H0" "choreo-diagnose.sh:main" "diagnostic complete" "{}"
echo ""
echo "Logs written to ${LOG_PATH}"
