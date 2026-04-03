use anyhow::Result;
use axum::{
    body::Body,
    extract::{Request, State},
    http::{HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::any,
    Router,
};
use http_body_util::BodyExt;
use hyper_util::client::legacy::{connect::HttpConnector, Client};
use redis::AsyncCommands;
use std::{net::SocketAddr, sync::Arc};
use tracing::{info, warn};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
struct AppConfig {
    /// Address to listen on.
    listen_addr: SocketAddr,
    /// Base URL of the upstream service to proxy to.
    upstream_url: String,
    /// Maximum requests per window per client IP.
    rate_limit: u64,
    /// Window size in seconds.
    window_seconds: u64,
}

impl AppConfig {
    fn from_env() -> Self {
        let listen_addr: SocketAddr = std::env::var("LISTEN_ADDR")
            .unwrap_or_else(|_| "0.0.0.0:3000".to_string())
            .parse()
            .expect("LISTEN_ADDR must be a valid socket address");

        let upstream_url = std::env::var("UPSTREAM_URL")
            .unwrap_or_else(|_| "http://fake-api:8000".to_string());

        let rate_limit: u64 = std::env::var("RATE_LIMIT")
            .unwrap_or_else(|_| "100".to_string())
            .parse()
            .expect("RATE_LIMIT must be a positive integer");

        let window_seconds: u64 = std::env::var("WINDOW_SECONDS")
            .unwrap_or_else(|_| "60".to_string())
            .parse()
            .expect("WINDOW_SECONDS must be a positive integer");

        Self {
            listen_addr,
            upstream_url,
            rate_limit,
            window_seconds,
        }
    }
}

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

struct AppState {
    config: AppConfig,
    redis: redis::aio::ConnectionManager,
    http_client: Client<HttpConnector, Body>,
}

// ---------------------------------------------------------------------------
// Rate-limit check
// ---------------------------------------------------------------------------

/// Returns `Ok(remaining)` if the request is allowed, or `Err(())` when the
/// client has exceeded their quota.
async fn check_rate_limit(
    state: &AppState,
    client_ip: &str,
    path: &str,
) -> Result<u64, ()> {
    let key = format!("rl:hits:{}:{}", client_ip, path);
    let mut conn = state.redis.clone();

    let count: u64 = conn
        .incr(&key, 1_u64)
        .await
        .unwrap_or(1);

    if count == 1 {
        // Set TTL on first hit so the window expires automatically.
        let _: () = conn
            .expire(&key, state.config.window_seconds as i64)
            .await
            .unwrap_or(());
    }

    if count > state.config.rate_limit {
        warn!(
            client_ip,
            path,
            count,
            limit = state.config.rate_limit,
            "Rate limit exceeded"
        );
        Err(())
    } else {
        Ok(state.config.rate_limit.saturating_sub(count))
    }
}

// ---------------------------------------------------------------------------
// Proxy handler
// ---------------------------------------------------------------------------

async fn proxy_handler(
    State(state): State<Arc<AppState>>,
    req: Request,
) -> Response {
    // Extract client IP from X-Forwarded-For or peer address fallback.
    let client_ip = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(str::trim)
        .unwrap_or("unknown")
        .to_string();

    let path = req.uri().path().to_string();

    // Health check bypass — don't rate-limit the health probe.
    if path == "/health" {
        return (
            StatusCode::OK,
            axum::Json(serde_json::json!({"status": "ok", "service": "rate-limiter"})),
        )
            .into_response();
    }

    // Rate-limit check.
    match check_rate_limit(&state, &client_ip, &path).await {
        Err(()) => {
            let mut resp = (
                StatusCode::TOO_MANY_REQUESTS,
                axum::Json(serde_json::json!({
                    "error": "Too Many Requests",
                    "message": "Rate limit exceeded. Please slow down.",
                })),
            )
                .into_response();
            resp.headers_mut().insert(
                "Retry-After",
                HeaderValue::from(state.config.window_seconds),
            );
            return resp;
        }
        Ok(remaining) => {
            info!(client_ip, path, remaining, "Request allowed");
        }
    }

    // Forward request to upstream.
    let upstream_uri = format!(
        "{}{}",
        state.config.upstream_url.trim_end_matches('/'),
        req.uri()
    );

    let (parts, body) = req.into_parts();
    let body_bytes = match body.collect().await {
        Ok(b) => b.to_bytes(),
        Err(_) => {
            return (StatusCode::BAD_GATEWAY, "Failed to read request body").into_response();
        }
    };

    let mut upstream_req = hyper::Request::builder()
        .method(parts.method)
        .uri(&upstream_uri);

    for (name, value) in &parts.headers {
        upstream_req = upstream_req.header(name, value);
    }

    let upstream_req = match upstream_req.body(Body::from(body_bytes)) {
        Ok(r) => r,
        Err(_) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to build upstream request")
                .into_response();
        }
    };

    match state.http_client.request(upstream_req).await {
        Ok(upstream_resp) => {
            let (resp_parts, resp_body) = upstream_resp.into_parts();
            let resp_bytes = match resp_body.collect().await {
                Ok(b) => b.to_bytes(),
                Err(_) => {
                    return (StatusCode::BAD_GATEWAY, "Failed to read upstream response")
                        .into_response();
                }
            };

            let mut response = Response::builder().status(resp_parts.status);
            for (name, value) in &resp_parts.headers {
                response = response.header(name, value);
            }
            response.body(Body::from(resp_bytes)).unwrap_or_else(|_| {
                (StatusCode::INTERNAL_SERVER_ERROR, "Failed to build response").into_response()
            })
        }
        Err(e) => {
            warn!(error = %e, upstream = %upstream_uri, "Upstream request failed");
            (StatusCode::BAD_GATEWAY, "Upstream service unavailable").into_response()
        }
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "rate_limiter=info,tower_http=debug".into()),
        )
        .init();

    let config = AppConfig::from_env();
    info!(?config.listen_addr, upstream = %config.upstream_url, "Starting rate-limiter");

    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
    let redis_client = redis::Client::open(redis_url)?;
    let redis_conn = redis::aio::ConnectionManager::new(redis_client).await?;

    let http_client = Client::builder(hyper_util::rt::TokioExecutor::new()).build_http();

    let state = Arc::new(AppState {
        config: config.clone(),
        redis: redis_conn,
        http_client,
    });

    let app = Router::new()
        .route("/{*path}", any(proxy_handler))
        .route("/", any(proxy_handler))
        .with_state(state)
        .layer(
            tower_http::trace::TraceLayer::new_for_http(),
        );

    let listener = tokio::net::TcpListener::bind(config.listen_addr).await?;
    info!("Listening on {}", config.listen_addr);
    axum::serve(listener, app).await?;

    Ok(())
}
