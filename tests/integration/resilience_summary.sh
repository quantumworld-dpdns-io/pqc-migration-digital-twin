#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "usage: $0 <resilience-log-path>" >&2
  exit 2
fi

LOG_FILE="$1"
if [ ! -f "$LOG_FILE" ]; then
  echo "log file not found: $LOG_FILE" >&2
  exit 2
fi

has_line() {
  local pattern="$1"
  if grep -Fq "$pattern" "$LOG_FILE"; then
    echo "true"
  else
    echo "false"
  fi
}

baseline_200="$(has_line "[integration-resilience] status 200 confirmed for POST http://localhost:8080/api/v1/risk")"
fault_stop="$(has_line "[integration-resilience] Fault injection: stop rust-risk")"
health_during_outage="$(has_line "[integration-resilience] nginx health during downstream outage is healthy")"
degraded_502="$(has_line "[integration-resilience] status 502 confirmed for POST http://localhost:8080/api/v1/risk")"
restart_step="$(has_line "[integration-resilience] Restart rust-risk")"
rust_ready_after_restart="$(has_line "[integration-resilience] rust-risk after restart is healthy")"
recovered_200="$(has_line "[integration-resilience] Restart + degraded-path checks passed")"

if [ "$baseline_200" = "true" ] &&
   [ "$fault_stop" = "true" ] &&
   [ "$health_during_outage" = "true" ] &&
   [ "$degraded_502" = "true" ] &&
   [ "$restart_step" = "true" ] &&
   [ "$rust_ready_after_restart" = "true" ] &&
   [ "$recovered_200" = "true" ]; then
  overall="pass"
else
  overall="fail"
fi

cat <<EOF
{
  "schema_version": 1,
  "source_log": "$LOG_FILE",
  "overall": "$overall",
  "checks": {
    "baseline_risk_200": $baseline_200,
    "fault_injection_stop_rust_risk": $fault_stop,
    "gateway_health_during_outage": $health_during_outage,
    "degraded_risk_502": $degraded_502,
    "restart_rust_risk": $restart_step,
    "rust_risk_healthy_after_restart": $rust_ready_after_restart,
    "end_to_end_recovery_complete": $recovered_200
  }
}
EOF

