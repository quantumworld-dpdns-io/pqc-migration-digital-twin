FROM golang:1.22-alpine AS build
WORKDIR /src
# database module must be present before gateway so the replace directive resolves
COPY src/go/database/ ./database/
COPY src/go/gateway/go.mod ./go.mod
COPY src/go/gateway/ .
ENV GOFLAGS="-mod=mod"
RUN go build -o /out/gateway ./cmd/gateway

FROM alpine:3.20
RUN adduser -D -H -u 10001 appuser
USER appuser
COPY --from=build /out/gateway /usr/local/bin/gateway
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/gateway"]
