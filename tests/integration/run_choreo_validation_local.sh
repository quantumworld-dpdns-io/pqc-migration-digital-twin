#!/usr/bin/env bash
set -u
RUN_ID="${1:-$(date +%Y%m%d_%H%M%S)}"
OUT="tests/integration/artifacts/choreo-validation/${RUN_ID}"
mkdir -p "$OUT"

echo "run_id=$RUN_ID" > "$OUT/meta.txt"
date "+%Y-%m-%d %H:%M:%S %Z" >> "$OUT/meta.txt"
git rev-parse --short HEAD >> "$OUT/meta.txt"

BUILD_LOG="$OUT/dockerfile-build.log"
: > "$BUILD_LOG"
for spec in \
  "nginx docker-images/nginx/Dockerfile docker-images/nginx" \
  "go-services docker-images/go-services/Dockerfile docker-images/go-services" \
  "python-services docker-images/python-services/Dockerfile docker-images/python-services" \
  "rust-risk docker-images/rust-risk/Dockerfile docker-images/rust-risk"
do
  name=$(echo "$spec" | awk '{print $1}')
  file=$(echo "$spec" | awk '{print $2}')
  ctx=$(echo "$spec" | awk '{print $3}')
  echo "=== BUILD $name ($file) ===" | tee -a "$BUILD_LOG"
  if docker build -q -f "$file" "$ctx" > "$OUT/${name}.image-id.txt" 2>>"$BUILD_LOG"; then
    echo "PASS $name" | tee -a "$BUILD_LOG"
  else
    echo "FAIL $name" | tee -a "$BUILD_LOG"
  fi
  echo >> "$BUILD_LOG"
done

STACK_LOG="$OUT/compose-health-e2e.log"
: > "$STACK_LOG"
compose_file="docker-compose.microservices.yml"

if docker compose -f "$compose_file" up -d >>"$STACK_LOG" 2>&1; then
  echo "COMPOSE_UP=PASS" | tee -a "$STACK_LOG"
else
  echo "COMPOSE_UP=FAIL" | tee -a "$STACK_LOG"
fi

docker compose -f "$compose_file" ps > "$OUT/compose-ps.txt" 2>>"$STACK_LOG" || true

BASE="http://localhost:8080"
health_status=$(curl -s -o "$OUT/health-body.json" -w "%{http_code}" "$BASE/health" || true)
echo "health_status=$health_status" | tee -a "$STACK_LOG"

for p in "/api/v1/discovery" "/api/v1/assets" "/api/v1/risk" "/api/v1/risk/backlog" "/api/v1/proof" "/api/v1/qasm"
do
  body_file="$OUT$(echo "$p" | tr "/" "_").json"
  case "$p" in
    "/api/v1/discovery") payload='{}' ;;
    "/api/v1/assets") payload='{"limit":5}' ;;
    "/api/v1/risk") payload='{"asset":"asset-001","risk":0.5}' ;;
    "/api/v1/risk/backlog") payload='{"threats":[{"id":"t1","score":0.9}],"capacity":5}' ;;
    "/api/v1/proof") payload='{"artifact":"hello","key":"demo"}' ;;
    "/api/v1/qasm") payload='{"program":"OPENQASM 2.0; qreg q[1]; creg c[1]; measure q[0] -> c[0];"}' ;;
  esac
  code=$(curl -s -o "$body_file" -w "%{http_code}" -H "Content-Type: application/json" -d "$payload" "$BASE$p" || true)
  echo "$p=$code" | tee -a "$STACK_LOG"
done

if docker compose -f "$compose_file" down >>"$STACK_LOG" 2>&1; then
  echo "COMPOSE_DOWN=PASS" | tee -a "$STACK_LOG"
else
  echo "COMPOSE_DOWN=FAIL" | tee -a "$STACK_LOG"
fi

CHECKOV_LOG="$OUT/checkov-dockerfiles.log"
: > "$CHECKOV_LOG"
if command -v checkov >/dev/null 2>&1; then
  checkov --framework dockerfile \
    -f docker-images/nginx/Dockerfile \
    -f docker-images/go-services/Dockerfile \
    -f docker-images/python-services/Dockerfile \
    -f docker-images/rust-risk/Dockerfile \
    >>"$CHECKOV_LOG" 2>&1
  echo "checkov_exit=$?" >> "$OUT/meta.txt"
else
  echo "checkov_not_installed" | tee -a "$CHECKOV_LOG"
fi

python3 - <<PY
import json, pathlib, re
out = pathlib.Path("$OUT")
summary = {"run_id":"$RUN_ID","build":{},"compose":{},"checkov":{}}
blog = (out / "dockerfile-build.log").read_text(errors="ignore")
for name in ["nginx","go-services","python-services","rust-risk"]:
  summary["build"][name] = "PASS" if f"PASS {name}" in blog else "FAIL"
slog = (out / "compose-health-e2e.log").read_text(errors="ignore")
for k in ["COMPOSE_UP","COMPOSE_DOWN"]:
  m = re.search(rf"{k}=(PASS|FAIL)", slog)
  summary["compose"][k.lower()] = m.group(1) if m else "UNKNOWN"
for p in ["health_status","/api/v1/discovery","/api/v1/assets","/api/v1/risk","/api/v1/risk/backlog","/api/v1/proof","/api/v1/qasm"]:
  if p == "health_status":
    m = re.search(r"health_status=(\d+)", slog)
    summary["compose"][p] = m.group(1) if m else "NA"
  else:
    m = re.search(re.escape(p)+r"=(\d+)", slog)
    summary["compose"][p] = m.group(1) if m else "NA"
clog = (out / "checkov-dockerfiles.log").read_text(errors="ignore")
if "checkov_not_installed" in clog:
  summary["checkov"]["status"] = "NOT_INSTALLED"
else:
  summary["checkov"]["status"] = "RAN"
  passed = re.search(r"Passed checks:\s*(\d+)", clog)
  failed = re.search(r"Failed checks:\s*(\d+)", clog)
  summary["checkov"]["passed_checks"] = int(passed.group(1)) if passed else None
  summary["checkov"]["failed_checks"] = int(failed.group(1)) if failed else None
(out / "summary.json").write_text(json.dumps(summary, indent=2))
print(json.dumps(summary, indent=2))
PY

echo "$RUN_ID"
