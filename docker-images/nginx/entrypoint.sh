#!/bin/sh
set -e

RUNTIME_DIR="/tmp/nginx-runtime"
NGINX_CONF="${RUNTIME_DIR}/nginx.conf"

GO_SERVICES_HOST="${GO_SERVICES_HOST:-go-services:8080}"
CORS_ALLOW_ORIGIN="${CORS_ALLOW_ORIGIN:-http://localhost:3000}"
NGINX_ENV="${NGINX_ENV:-choreo}"

# Choreo injects empty strings for unset connection env vars.
case "$GO_SERVICES_HOST" in
  ""|"http://"|"https://") GO_SERVICES_HOST="go-services:8080" ;;
esac
case "$GO_SERVICES_HOST" in
  http://*|https://*)
    GO_SERVICES_HOST=$(printf '%s' "$GO_SERVICES_HOST" | sed -E 's|https?://([^/]+).*|\1|')
    ;;
esac
[ -z "$GO_SERVICES_HOST" ] && GO_SERVICES_HOST="go-services:8080"

case "$NGINX_ENV" in
  ""|local|choreo) [ -z "$NGINX_ENV" ] && NGINX_ENV="choreo" ;;
  *)
    echo "Invalid NGINX_ENV='$NGINX_ENV' (expected: local|choreo)" >&2
    exit 1
    ;;
esac

# DNS resolver for lazy (request-time) upstream resolution. Read the cluster
# nameserver from /etc/resolv.conf; fall back to a sane default. This lets nginx
# start and stay Ready even when the Go backend DNS name does not exist yet.
RESOLVER="${RESOLVER:-$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf 2>/dev/null)}"
[ -z "$RESOLVER" ] && RESOLVER="127.0.0.11"

export GO_SERVICES_HOST CORS_ALLOW_ORIGIN NGINX_ENV RESOLVER

# #region agent log
echo "nginx-entrypoint: GO_SERVICES_HOST=${GO_SERVICES_HOST} NGINX_ENV=${NGINX_ENV} RESOLVER=${RESOLVER} RUNTIME_DIR=${RUNTIME_DIR}" >&2
# #endregion

mkdir -p "$RUNTIME_DIR"
cp /etc/nginx/locations.conf "${RUNTIME_DIR}/locations.conf"
cp "/etc/nginx/server-${NGINX_ENV}.conf" "${RUNTIME_DIR}/server.conf"

envsubst '$GO_SERVICES_HOST $CORS_ALLOW_ORIGIN $NGINX_ENV $RESOLVER' \
  < /etc/nginx/nginx.conf.template \
  > "$NGINX_CONF"

if ! nginx -t -c "$NGINX_CONF" >&2; then
  echo "nginx config test failed for ${NGINX_CONF}" >&2
  exit 1
fi

exec nginx -c "$NGINX_CONF" -g "daemon off;"
