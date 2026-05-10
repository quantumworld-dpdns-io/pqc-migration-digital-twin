FROM golang:1.22-alpine AS build
WORKDIR /src
COPY src/go/database/ ./database/
COPY src/go/gateway/ ./gateway/
WORKDIR /src/gateway
RUN GOWORK=off go build -mod=mod -o /out/gateway ./cmd/gateway

FROM alpine:3.20
RUN adduser -D -H -u 10001 appuser
USER appuser
COPY --from=build /out/gateway /usr/local/bin/gateway
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/gateway"]
