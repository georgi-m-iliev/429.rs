import fnmatch
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import config as config_router
from app.routers import metrics as metrics_router


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}
        self.ttl_by_key: dict[str, int] = {}

    async def get(self, key: str) -> str | None:
        return self.store.get(key)

    async def set(self, key: str, value: str) -> bool:
        self.store[key] = value
        return True

    async def keys(self, pattern: str) -> list[str]:
        return sorted([key for key in self.store if fnmatch.fnmatch(key, pattern)])

    async def ttl(self, key: str) -> int:
        return self.ttl_by_key.get(key, -1)

    async def delete(self, *keys: str) -> int:
        deleted = 0
        for key in keys:
            if key in self.store:
                del self.store[key]
                self.ttl_by_key.pop(key, None)
                deleted += 1
        return deleted


@pytest.fixture()
def fake_redis() -> FakeRedis:
    return FakeRedis()


@pytest.fixture(autouse=True)
def patch_redis_clients(monkeypatch: pytest.MonkeyPatch, fake_redis: FakeRedis) -> None:
    monkeypatch.setattr(metrics_router, "get_redis", lambda: fake_redis)


@pytest.fixture()
def app() -> FastAPI:
    test_app = FastAPI()
    test_app.include_router(config_router.router, prefix="/api/config", tags=["config"])
    test_app.include_router(metrics_router.router, prefix="/api/metrics", tags=["metrics"])

    @test_app.get("/health")
    def health_check() -> dict[str, str]:
        return {"status": "ok", "service": "bff"}

    return test_app


@pytest.fixture()
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client
