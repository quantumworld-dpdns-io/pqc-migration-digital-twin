# Consolidated single-component image for Choreo.
#
# Runs the Go gateway (public entry, :8080) together with the Go discovery,
# Python analysis/qasm, and Rust risk services in ONE container, reached over
# localhost. This removes all cross-component Choreo connections (the connection
# wizard could not publish/select project services), so the whole API functions
# from a single Public component.
#
# IMPORTANT: build context MUST be the repository root.
#   Choreo build config -> Docker Context: .   Dockerfile: docker-images/app/Dockerfile

# ---- Go build (gateway + discovery), static so it runs on the Debian final image
FROM golang:1.22-alpine AS build-go
WORKDIR /src
COPY docker-images/go-services/database/  ./database/
COPY docker-images/go-services/gateway/   ./gateway/
COPY docker-images/go-services/discovery/ ./discovery/
WORKDIR /src/gateway
RUN CGO_ENABLED=0 GOWORK=off go build -mod=mod -o /out/gateway ./cmd/gateway
WORKDIR /src/discovery
RUN CGO_ENABLED=0 go build -o /out/discovery ./cmd/discovery

# ---- Rust build (risk-service)
FROM rust:1.78-slim AS build-rust
WORKDIR /workspace
COPY docker-images/rust-risk/Cargo.toml docker-images/rust-risk/Cargo.lock ./
COPY docker-images/rust-risk/shared-contracts ./shared-contracts
COPY docker-images/rust-risk/risk-engine     ./risk-engine
COPY docker-images/rust-risk/zk-proof         ./zk-proof
COPY docker-images/rust-risk/risk-service     ./risk-service
COPY docker-images/rust-risk/proof-verifier   ./proof-verifier
RUN cargo build --release -p risk-service

# ---- Final image: Python base (glibc/bookworm) + Go & Rust binaries
FROM python:3.12-slim
RUN groupadd -r appuser && useradd -r -g appuser -u 10014 appuser \
    && apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Python services (stdlib only)
COPY docker-images/python-services/service.py        /app/service.py
COPY docker-images/python-services/hndl_analysis/    /app/hndl_analysis/
COPY docker-images/python-services/qasm_workflows/   /app/qasm_workflows/
COPY docker-images/python-services/qasm_examples/    /app/qasm_examples/

# Go + Rust binaries
COPY --from=build-go   /out/gateway                              /usr/local/bin/gateway
COPY --from=build-go   /out/discovery                            /usr/local/bin/discovery
COPY --from=build-rust /workspace/target/release/risk-service    /usr/local/bin/risk-service

COPY docker-images/app/start.sh /start.sh
RUN chmod +x /start.sh && chown -R appuser:appuser /app

# Gateway reaches every dependency over localhost — no Choreo connections needed.
ENV PYTHONUNBUFFERED=1 \
    DISCOVERY_BASE_URL=http://localhost:8081 \
    PYTHON_BASE_URL=http://localhost:8082 \
    RUST_BASE_URL=http://localhost:8083 \
    QASM_BASE_URL=http://localhost:8084

USER 10014
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/health || exit 1
ENTRYPOINT ["/start.sh"]
