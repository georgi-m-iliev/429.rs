from fastapi.testclient import TestClient


def test_metrics_summary_and_reset(client: TestClient, fake_redis) -> None:
    fake_redis.store["rl:hits:127.0.0.1:/products"] = "5"
    fake_redis.store["rl:hits:10.0.0.2:/users"] = "2"
    fake_redis.ttl_by_key["rl:hits:127.0.0.1:/products"] = 44
    fake_redis.ttl_by_key["rl:hits:10.0.0.2:/users"] = 51

    summary = client.get("/api/metrics/summary")

    assert summary.status_code == 200
    body = summary.json()
    assert body["total_tracked_clients"] == 2
    assert body["entries"] == [
        {
            "client_ip": "10.0.0.2",
            "path": "/users",
            "request_count": 2,
            "ttl_seconds": 51,
        },
        {
            "client_ip": "127.0.0.1",
            "path": "/products",
            "request_count": 5,
            "ttl_seconds": 44,
        },
    ]

    reset = client.delete("/api/metrics/reset")
    assert reset.status_code == 200
    assert reset.json() == {"deleted_keys": 2}

    after_reset = client.get("/api/metrics/summary")
    assert after_reset.status_code == 200
    assert after_reset.json() == {"total_tracked_clients": 0, "entries": []}
