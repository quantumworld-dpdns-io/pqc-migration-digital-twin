#!/bin/sh
set -e

cleanup() {
    kill "$DISCOVERY_PID" 2>/dev/null
    exit 0
}
trap cleanup TERM INT

/usr/local/bin/discovery &
DISCOVERY_PID=$!

exec /usr/local/bin/gateway
