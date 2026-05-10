FROM golang:1.22-alpine AS build-gateway
WORKDIR /src
COPY database/ ./database/
COPY gateway/ ./gateway/
RUN printf 'go 1.22\nuse (\n\t./gateway\n\t./database\n)\n' > go.work
WORKDIR /src/gateway
ENV GOFLAGS="-mod=mod"
RUN go build -o /out/gateway ./cmd/gateway

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
ENTRYPOINT ["/start.sh"]
