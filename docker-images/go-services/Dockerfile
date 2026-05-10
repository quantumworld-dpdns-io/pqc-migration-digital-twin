FROM golang:1.22-alpine AS build-gateway
WORKDIR /src
COPY src/go/gateway/go.mod ./go.mod
COPY src/go/gateway/ .
RUN go build -o /out/gateway ./cmd/gateway

FROM golang:1.22-alpine AS build-discovery
WORKDIR /src
COPY src/go/discovery/go.mod ./go.mod
COPY src/go/discovery/ .
RUN go build -o /out/discovery ./cmd/discovery

FROM alpine:3.20
RUN adduser -D -H -u 10014 appuser
COPY --from=build-gateway  /out/gateway   /usr/local/bin/gateway
COPY --from=build-discovery /out/discovery /usr/local/bin/discovery
COPY docker-images/go-services/start.sh /start.sh
RUN chmod +x /start.sh
USER 10014
EXPOSE 8080 8081
ENTRYPOINT ["/start.sh"]
