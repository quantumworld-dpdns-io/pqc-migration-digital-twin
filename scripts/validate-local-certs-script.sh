#!/usr/bin/env bash
set -euo pipefail

TARGET="scripts/generate-local-certs.sh"

if [ ! -f "$TARGET" ]; then
  echo "[lint][scripts] Missing $TARGET"
  exit 1
fi

if ! command -v bash >/dev/null 2>&1; then
  echo "[lint][scripts] Skipping: bash is not installed."
  exit 0
fi

bash -n "$TARGET"

grep_bin="grep"
if ! command -v "$grep_bin" >/dev/null 2>&1; then
  echo "[lint][scripts] Skipping content checks: grep is not installed."
  echo "[lint][scripts] Syntax check passed for $TARGET"
  exit 0
fi

require_marker() {
  local marker="$1"
  if ! "$grep_bin" -Fq "$marker" "$TARGET"; then
    echo "[lint][scripts] Missing expected marker in $TARGET: $marker"
    exit 1
  fi
}

# Validate stable path/output markers required by Phase 2.
require_marker 'DEST="docker-images/nginx/certs"'
require_marker 'localhost.key'
require_marker 'localhost.crt'
require_marker 'Certificates written to $DEST/'

echo "[lint][scripts] Syntax and marker checks passed for $TARGET"
