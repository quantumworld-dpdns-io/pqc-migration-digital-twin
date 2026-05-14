#!/bin/sh
set -e

GO_SERVICES_HOST="${GO_SERVICES_HOST:-go-services:8080}"
CORS_ALLOW_ORIGIN="${CORS_ALLOW_ORIGIN:-http://localhost:3000}"
NGINX_ENV="${NGINX_ENV:-choreo}"

case "$NGINX_ENV" in
  local|choreo) ;;
  *)
    echo "Invalid NGINX_ENV='$NGINX_ENV' (expected: local|choreo)" >&2
    exit 1
    ;;
esac

export GO_SERVICES_HOST CORS_ALLOW_ORIGIN NGINX_ENV

envsubst '$GO_SERVICES_HOST $CORS_ALLOW_ORIGIN $NGINX_ENV' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf

mkdir -p /etc/nginx/conf.d
cp /etc/nginx/locations.conf /etc/nginx/conf.d/locations.conf
cp "/etc/nginx/server-${NGINX_ENV}.conf" "/etc/nginx/conf.d/server-${NGINX_ENV}.conf"

exec nginx -g "daemon off;"
