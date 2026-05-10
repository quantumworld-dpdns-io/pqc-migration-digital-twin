#!/bin/sh
set -e

cleanup() {
    kill "$QASM_PID" 2>/dev/null
    exit 0
}
trap cleanup TERM INT

python /app/src/qasm/examples/service/qasm_service.py &
QASM_PID=$!

exec python /app/service.py
