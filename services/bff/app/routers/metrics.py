"""
Metrics router — exposes rate-limit counters stored by the Rust rate-limiter service.
"""
from fastapi import APIRouter
from app.redis_client import get_redis

router = APIRouter()


@router.get("/summary")
async def get_metrics_summary():
    """Return aggregated metrics from Redis counters written by the rate-limiter."""
    r = get_redis()
    keys = await r.keys("rl:hits:*")

    summary: list[dict] = []
    for key in sorted(keys):
        # Key format: rl:hits:<client_ip>:<path>
        parts = key.split(":", 3)
        client_ip = parts[2] if len(parts) > 2 else "unknown"
        path = parts[3] if len(parts) > 3 else "/"
        count = int(await r.get(key) or 0)
        ttl = await r.ttl(key)
        summary.append(
            {
                "client_ip": client_ip,
                "path": path,
                "request_count": count,
                "ttl_seconds": ttl,
            }
        )

    return {"total_tracked_clients": len(summary), "entries": summary}


@router.delete("/reset")
async def reset_metrics():
    """Clear all rate-limit counters (useful for testing)."""
    r = get_redis()
    keys = await r.keys("rl:hits:*")
    if keys:
        await r.delete(*keys)
    return {"deleted_keys": len(keys)}
