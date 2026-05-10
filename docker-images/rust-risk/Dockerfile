FROM rust:1.78-slim AS build
WORKDIR /workspace
COPY Cargo.toml Cargo.lock ./
COPY shared-contracts ./shared-contracts
COPY risk-engine ./risk-engine
COPY zk-proof ./zk-proof
COPY risk-service ./risk-service
COPY proof-verifier ./proof-verifier
RUN cargo build --release -p risk-service

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -u 10014 -M -r appuser
COPY --from=build /workspace/target/release/risk-service /usr/local/bin/risk-service
USER 10014
EXPOSE 8083
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8083/health || exit 1
ENTRYPOINT ["/usr/local/bin/risk-service"]
