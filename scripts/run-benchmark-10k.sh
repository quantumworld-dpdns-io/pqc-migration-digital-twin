#!/usr/bin/env bash
set -euo pipefail

PROFILE_FILE="${PROFILE_FILE:-tests/perf/benchmark_10k.env}"
if [ -f "$PROFILE_FILE" ]; then
  # shellcheck disable=SC1090
  source "$PROFILE_FILE"
fi

BASE_URL="${GATEWAY_BASE_URL:-http://localhost:8080}"
USERS="${USERS:-40}"
SPAWN_RATE="${SPAWN_RATE:-10}"
DURATION="${DURATION:-60s}"
LOCUSTFILE="${LOCUSTFILE:-tests/locust/benchmark_10k_locustfile.py}"
ASSET_EQUIVALENT="${ASSET_EQUIVALENT:-10000}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.microservices.yml}"
ARTIFACT_ROOT="${ARTIFACT_ROOT:-tests/integration/artifacts/benchmark-10k}"
RUN_ID="${RUN_ID:-$(date +%Y%m%d_%H%M%S)}"
RUN_DIR="$ARTIFACT_ROOT/$RUN_ID"
SUMMARY_JSON="$RUN_DIR/summary.json"
LOCAL_URL="http://localhost:8080"
IS_LOCAL="false"
if [ "$BASE_URL" = "$LOCAL_URL" ]; then
  IS_LOCAL="true"
fi

mkdir -p "$RUN_DIR"

write_failure_summary() {
  local reason="$1"
  python3 - "$SUMMARY_JSON" "$reason" "$BASE_URL" "$RUN_ID" "$ASSET_EQUIVALENT" "$USERS" "$SPAWN_RATE" "$DURATION" <<'PY'
import json
import sys
from datetime import datetime, timezone

out = {
    "status": "failed",
    "failure_reason": sys.argv[2],
    "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    "run_id": sys.argv[4],
    "base_url": sys.argv[3],
    "scenario": {
        "asset_equivalent": int(sys.argv[5]),
        "users": int(sys.argv[6]),
        "spawn_rate": int(sys.argv[7]),
        "duration": sys.argv[8],
    },
}
with open(sys.argv[1], "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, sort_keys=True)
PY
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    write_failure_summary "missing required command: $cmd"
    echo "[benchmark-10k] ERROR: required command not found: $cmd" >&2
    echo "[benchmark-10k] Summary written: $SUMMARY_JSON" >&2
    exit 2
  fi
}

require_cmd python3
require_cmd curl
require_cmd locust

if [ ! -f "$LOCUSTFILE" ]; then
  write_failure_summary "locustfile not found: $LOCUSTFILE"
  echo "[benchmark-10k] ERROR: locustfile not found: $LOCUSTFILE" >&2
  echo "[benchmark-10k] Summary written: $SUMMARY_JSON" >&2
  exit 2
fi

cleanup() {
  if [ "${STACK_STARTED:-false}" = "true" ]; then
    docker compose -f "$COMPOSE_FILE" down -v >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [ "$IS_LOCAL" = "true" ]; then
  require_cmd docker
  if [ ! -f "$COMPOSE_FILE" ]; then
    write_failure_summary "docker compose file not found: $COMPOSE_FILE"
    echo "[benchmark-10k] ERROR: compose file not found: $COMPOSE_FILE" >&2
    echo "[benchmark-10k] Summary written: $SUMMARY_JSON" >&2
    exit 2
  fi

  if ! curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
    echo "[benchmark-10k] Local gateway is down. Starting docker compose stack..."
    if ! docker compose -f "$COMPOSE_FILE" up -d --build; then
      write_failure_summary "failed to start docker compose stack"
      echo "[benchmark-10k] ERROR: docker compose up failed" >&2
      echo "[benchmark-10k] Summary written: $SUMMARY_JSON" >&2
      exit 2
    fi
    STACK_STARTED="true"
  fi
fi

healthy="false"
for _ in $(seq 1 45); do
  if curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
    healthy="true"
    break
  fi
  sleep 2
done

if [ "$healthy" != "true" ]; then
  write_failure_summary "gateway health check failed at $BASE_URL/health"
  echo "[benchmark-10k] ERROR: gateway not healthy at $BASE_URL/health" >&2
  echo "[benchmark-10k] Summary written: $SUMMARY_JSON" >&2
  exit 2
fi

CSV_PREFIX="$RUN_DIR/locust"
LOG_FILE="$RUN_DIR/locust.log"

set +e
locust \
  -f "$LOCUSTFILE" \
  --host "$BASE_URL" \
  --headless \
  -u "$USERS" \
  -r "$SPAWN_RATE" \
  -t "$DURATION" \
  --csv "$CSV_PREFIX" \
  --only-summary \
  >"$LOG_FILE" 2>&1
locust_exit=$?
set -e

if [ "$locust_exit" -ne 0 ]; then
  write_failure_summary "locust run failed with exit code $locust_exit"
  echo "[benchmark-10k] ERROR: locust failed (exit=$locust_exit). See $LOG_FILE" >&2
  echo "[benchmark-10k] Summary written: $SUMMARY_JSON" >&2
  exit "$locust_exit"
fi

STATS_CSV="${CSV_PREFIX}_stats.csv"
if [ ! -f "$STATS_CSV" ]; then
  write_failure_summary "missing locust stats csv: $STATS_CSV"
  echo "[benchmark-10k] ERROR: missing stats CSV: $STATS_CSV" >&2
  echo "[benchmark-10k] Summary written: $SUMMARY_JSON" >&2
  exit 2
fi

python3 - "$STATS_CSV" "$SUMMARY_JSON" "$RUN_ID" "$BASE_URL" "$ASSET_EQUIVALENT" "$USERS" "$SPAWN_RATE" "$DURATION" "$locust_exit" <<'PY'
import csv
import json
import sys
from datetime import datetime, timezone

stats_csv = sys.argv[1]
out_path = sys.argv[2]
run_id = sys.argv[3]
base_url = sys.argv[4]
asset_equivalent = int(sys.argv[5])
users = int(sys.argv[6])
spawn_rate = int(sys.argv[7])
duration = sys.argv[8]
locust_exit = int(sys.argv[9])

rows = []
agg = None
with open(stats_csv, newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        if row.get("Name") == "Aggregated":
            agg = row
        else:
            rows.append(row)

if agg is None:
    raise SystemExit("Aggregated row not found in locust stats CSV")

def as_int(value: str) -> int:
    try:
        return int(float(value or 0))
    except ValueError:
        return 0

def as_float(value: str) -> float:
    try:
        return float(value or 0)
    except ValueError:
        return 0.0

summary = {
    "status": "passed" if locust_exit == 0 else "failed",
    "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    "run_id": run_id,
    "base_url": base_url,
    "scenario": {
        "asset_equivalent": asset_equivalent,
        "users": users,
        "spawn_rate": spawn_rate,
        "duration": duration,
    },
    "aggregate": {
        "request_count": as_int(agg.get("Request Count", "0")),
        "failure_count": as_int(agg.get("Failure Count", "0")),
        "failure_rate": as_float(agg.get("Failure Rate", "0")),
        "rps": as_float(agg.get("Requests/s", "0")),
        "p50_ms": as_float(agg.get("50%", "0")),
        "p95_ms": as_float(agg.get("95%", "0")),
        "p99_ms": as_float(agg.get("99%", "0")),
        "max_ms": as_float(agg.get("Max Response Time", "0")),
        "avg_ms": as_float(agg.get("Average Response Time", "0")),
    },
    "per_endpoint": [
        {
            "name": row.get("Name", ""),
            "method": row.get("Type", ""),
            "request_count": as_int(row.get("Request Count", "0")),
            "failure_count": as_int(row.get("Failure Count", "0")),
            "failure_rate": as_float(row.get("Failure Rate", "0")),
            "rps": as_float(row.get("Requests/s", "0")),
            "p95_ms": as_float(row.get("95%", "0")),
        }
        for row in rows
    ],
}

with open(out_path, "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2, sort_keys=True)
PY

echo "[benchmark-10k] Benchmark completed."
echo "[benchmark-10k] Summary: $SUMMARY_JSON"
echo "[benchmark-10k] Raw artifacts: $RUN_DIR"
