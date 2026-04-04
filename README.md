# 429.rs — Distributed Rate Limiting for the Edge

A proof-of-concept API gateway that enforces rate limits, built with Rust, FastAPI, React, MongoDB, and Redis.

## Architecture

```
                  ┌────────────────────────────────────────────┐
Browser ──────────►  React UI  (dashboard + rule management)   │
                  └───────────────┬────────────────────────────┘
                                  │ /api/*
                  ┌───────────────▼────────────────────────────┐
                  │  BFF (FastAPI)  — config & metrics API     │
                  └───────────────┬────────────────────────────┘
                           ┌──────┴─────┐
                           │            │
                   ┌───────▼──────┐  ┌──▼────────────────────────────┐
                   │   MongoDB    │  │ Redis (shared counters store) │
                   │   (config)   │  └──▲────────────────────────────┘
                   └──────────────┘     │
                                        │
                  ┌─────────────────────┴─────────────────────────────┐
Client ───────────► Rate Limiter instances (Rust / Axum)  — gateway   │
                  └───────────────┬───────────────────────────────────┘
                                  │ proxied (if under limit)
                  ┌───────────────▼────────────────────────────┐
                  │  Fake API (FastAPI)  — simulated upstream  │
                  └────────────────────────────────────────────┘
```

| Component          | Tech                    | Port    |
|--------------------|-------------------------|---------|
| **UI**             | React + Vite + nginx    | `80`    |
| **BFF**            | Python / FastAPI        | `8001`  |
| **Rate Limiter**   | Rust / Axum             | `3000`  |
| **Fake API**       | Python / FastAPI        | `8000`  |
| **Redis**          | Redis 7                 | `6379`  |
| **MongoDB**        | MongoDB                 | `27017` |

## Services

### `services/rate-limiter` (Rust)
The core gateway. For every incoming request it:
1. Identifies the client by IP (honours `X-Forwarded-For`)
2. Increments a Redis counter keyed on `rl:hits:<ip>:<path>`
3. On first hit, sets an expiry equal to `WINDOW_SECONDS`
4. Returns **429 Too Many Requests** when the counter exceeds `RATE_LIMIT`
5. Otherwise proxies the request to `UPSTREAM_URL`

Environment variables:

| Var | Default | Description |
|---|---|---|
| `LISTEN_ADDR` | `0.0.0.0:3000` | Address to bind |
| `UPSTREAM_URL` | `http://fake-api:8000` | Upstream service |
| `REDIS_URL` | `redis://redis:6379` | Redis connection URL |
| `RATE_LIMIT` | `100` | Max requests per window |
| `WINDOW_SECONDS` | `60` | Rolling window duration |

### `services/fake-api` (Python / FastAPI)
A simple REST API with product and user endpoints that represents the external service being protected.

### `services/bff` (Python / FastAPI)
Backend For Frontend — manages rate-limit rules in MongoDB and exposes real-time metrics read from Redis counters written by the Rust service.

### `services/ui` (React)
Dashboard for viewing and managing rate-limit rules and live metrics.

## Quick Start (Docker Compose)

```bash
# Build and start everything
docker compose up --build

# Verify services
curl http://localhost:3000/products   # through the rate limiter
curl http://localhost:8000/products   # direct fake API
curl http://localhost:8001/health     # BFF health check
open http://localhost:80              # React dashboard
```

By default the rate limiter allows **10 requests per 60 seconds** per client IP (see `RATE_LIMIT` in `docker-compose.yml`). Try hammering the gateway to trigger a 429:

```bash
for i in $(seq 1 15); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/products; done
```

## Project Structure

```
429.rs/
├── docker-compose.yml
└── services/
    ├── fake-api/        # FastAPI — simulated upstream
    ├── bff/             # FastAPI — config & metrics API
    ├── rate-limiter/    # Rust/Axum — rate-limiting proxy
    └── ui/              # React — management dashboard
```

## License

See [LICENSE](LICENSE).
