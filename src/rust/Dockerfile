FROM rust:1.78-slim AS build
WORKDIR /workspace
COPY src/rust/Cargo.toml src/rust/Cargo.lock ./
COPY src/rust/shared-contracts ./shared-contracts
COPY src/rust/risk-engine ./risk-engine
COPY src/rust/zk-proof ./zk-proof
COPY src/rust/risk-service ./risk-service
RUN cargo build --release -p risk-service

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN useradd -u 10001 -M -r appuser
USER appuser
COPY --from=build /workspace/target/release/risk-service /usr/local/bin/risk-service
EXPOSE 8083
ENTRYPOINT ["/usr/local/bin/risk-service"]
