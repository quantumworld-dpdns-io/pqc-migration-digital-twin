FROM nginx:1.27-alpine3.21
RUN addgroup -S appgroup && adduser -S -G appgroup -u 10014 appuser && mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp && chown -R appuser:appgroup /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && touch /var/run/nginx.pid && chown appuser:appgroup /var/run/nginx.pid
COPY nginx.conf /etc/nginx/nginx.conf
USER 10014
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD ["wget", "-q", "--spider", "http://localhost:8080/health"]
ENTRYPOINT ["nginx", "-g", "daemon off;"]
