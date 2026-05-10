#!/bin/sh
set -e

GO_SERVICES_HOST="${GO_SERVICES_HOST:-go-services:8080}"
CORS_ALLOW_ORIGIN="${CORS_ALLOW_ORIGIN:-http://localhost:3000}"

export GO_SERVICES_HOST CORS_ALLOW_ORIGIN

envsubst '$GO_SERVICES_HOST $CORS_ALLOW_ORIGIN' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf

mkdir -p /etc/nginx/conf.d
cp /etc/nginx/locations.conf /etc/nginx/conf.d/locations.conf

exec nginx -g "daemon off;"
