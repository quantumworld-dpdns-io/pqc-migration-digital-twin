FROM golang:1.22-alpine AS build-gateway
WORKDIR /src
COPY database/ ./database/
COPY gateway/ ./gateway/
WORKDIR /src/gateway
RUN GOWORK=off go build -mod=mod -o /out/gateway ./cmd/gateway

FROM golang:1.22-alpine AS build-discovery
WORKDIR /src
COPY discovery/go.mod ./go.mod
COPY discovery/ .
RUN go build -o /out/discovery ./cmd/discovery

FROM alpine:3.20
RUN adduser -D -H -u 10014 appuser
COPY --from=build-gateway  /out/gateway   /usr/local/bin/gateway
COPY --from=build-discovery /out/discovery /usr/local/bin/discovery
COPY start.sh /start.sh
RUN chmod +x /start.sh
USER 10014
EXPOSE 8080 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1
ENTRYPOINT ["/start.sh"]
