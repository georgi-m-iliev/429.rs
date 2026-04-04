FROM rust:1.94-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache dependencies by copying manifests first
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true
RUN rm -f src/main.rs

# Build the actual application
COPY src ./src
RUN touch src/main.rs && cargo build --release

# Runtime stage
FROM debian:trixie-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/rate-limiter .

EXPOSE 3000

ENV LISTEN_ADDR=0.0.0.0:3000
ENV UPSTREAM_URL=http://fake-api:8000
ENV REDIS_URL=redis://redis:6379
ENV RATE_LIMIT=100
ENV WINDOW_SECONDS=60

CMD ["./rate-limiter"]
