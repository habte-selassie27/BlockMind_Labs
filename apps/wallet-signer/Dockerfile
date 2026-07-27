FROM rust:1.80-slim AS builder
WORKDIR /app
COPY apps/wallet-signer/Cargo.toml ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release
COPY apps/wallet-signer/src ./src
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/wallet-signer /usr/local/bin/
EXPOSE 8004
CMD ["wallet-signer"]
