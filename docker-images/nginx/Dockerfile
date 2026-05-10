FROM nginx:1.27-alpine3.21
RUN apk upgrade --no-cache libcrypto3 libssl3 libxml2 && apk add --no-cache gettext && addgroup -S appgroup && adduser -S -G appgroup -u 10014 appuser && mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp /etc/nginx/certs /etc/nginx/conf.d && chown -R appuser:appgroup /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /etc/nginx/certs && touch /var/run/nginx.pid && chown appuser:appgroup /var/run/nginx.pid
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY locations.conf      /etc/nginx/locations.conf
COPY server-local.conf   /etc/nginx/server-local.conf
COPY server-choreo.conf  /etc/nginx/server-choreo.conf
COPY entrypoint.sh       /entrypoint.sh
RUN chmod +x /entrypoint.sh
USER 10014
EXPOSE 80 8080 443
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD ["wget", "-q", "--spider", "http://localhost:8080/health"]
ENTRYPOINT ["/entrypoint.sh"]
