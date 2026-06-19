#!/bin/sh
set -e

# Launch every dependency in the background, then run the gateway in the
# foreground as the container's main process. All services talk over localhost.
pids=""

/usr/local/bin/discovery &
pids="$pids $!"

/usr/local/bin/risk-service &
pids="$pids $!"

python /app/service.py &
pids="$pids $!"

python /app/qasm_examples/service/qasm_service.py &
pids="$pids $!"

cleanup() {
    kill $pids 2>/dev/null
    exit 0
}
trap cleanup TERM INT

# #region agent log
echo "app-entrypoint: started discovery(8081) risk(8083) analysis(8082) qasm(8084); exec gateway(8080)" >&2
# #endregion

exec /usr/local/bin/gateway
