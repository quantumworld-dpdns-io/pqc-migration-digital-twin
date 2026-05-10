FROM golang:1.22-alpine AS build
WORKDIR /src
COPY src/go/database/ ./database/
COPY src/go/gateway/ ./gateway/
RUN printf 'go 1.22\nuse (\n\t./gateway\n\t./database\n)\n' > go.work
WORKDIR /src/gateway
ENV GOFLAGS="-mod=mod"
RUN go build -o /out/gateway ./cmd/gateway

FROM alpine:3.20
RUN adduser -D -H -u 10001 appuser
USER appuser
COPY --from=build /out/gateway /usr/local/bin/gateway
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/gateway"]
