FROM golang:1.22-alpine AS build
WORKDIR /src
COPY src/go/discovery/go.mod ./go.mod
COPY src/go/discovery/ .
RUN go build -o /out/discovery ./cmd/discovery

FROM alpine:3.20
RUN adduser -D -H -u 10001 appuser
USER appuser
COPY --from=build /out/discovery /usr/local/bin/discovery
EXPOSE 8081
ENTRYPOINT ["/usr/local/bin/discovery"]
