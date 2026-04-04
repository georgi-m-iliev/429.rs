import datetime

import pytest
from fastapi.testclient import TestClient

from app.routers import config as config_router


def test_health_check(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "bff"}


class FakeQuery:
    def __init__(self, items, on_delete=None):
        self._items = items
        self._on_delete = on_delete

    async def to_list(self):
        return self._items

    async def delete(self):
        if self._on_delete is not None:
            self._on_delete()


class FakeServiceConfig:
    store: dict[str, "FakeServiceConfig"] = {}
    next_id = 1
    url = object()
    tenant_id = object()

    def __init__(self, tenant_id: str, url: str, description: str | None = None, enabled: bool = True):
        now = datetime.datetime.now(tz=datetime.timezone.utc)
        self.id = f"svc-{FakeServiceConfig.next_id}"
        FakeServiceConfig.next_id += 1
        self.tenant_id = tenant_id
        self.url = url
        self.description = description
        self.enabled = enabled
        self.created_at = now
        self.updated_at = now

    @classmethod
    async def find_one(cls, *_args, **_kwargs):
        return None

    @classmethod
    async def get(cls, service_id: str):
        return cls.store.get(service_id)

    @classmethod
    def find_all(cls):
        return FakeQuery(list(cls.store.values()))

    @classmethod
    def find(cls, *_args, **_kwargs):
        return FakeQuery(list(cls.store.values()))

    async def insert(self):
        FakeServiceConfig.store[self.id] = self

    async def delete(self):
        FakeServiceConfig.store.pop(self.id, None)

    def to_response(self):
        rules = [rule.to_response() for rule in FakeRuleConfig.store.values() if rule.service.id == self.id]
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "url": self.url,
            "description": self.description,
            "enabled": self.enabled,
            "rules": rules,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class FakeRuleConfig:
    store: dict[str, "FakeRuleConfig"] = {}
    next_id = 1
    service = type("ServiceField", (), {"id": object()})()

    def __init__(self, service, name, path_pattern, limit, priority, header_overrides):
        now = datetime.datetime.now(tz=datetime.timezone.utc)
        self.id = f"rule-{FakeRuleConfig.next_id}"
        FakeRuleConfig.next_id += 1
        self.service = service
        self.enabled = True
        self.name = name
        self.path_pattern = path_pattern
        self.limit = limit
        self.priority = priority
        self.header_overrides = header_overrides
        self.created_at = now
        self.updated_at = now

    def model_dump(self, mode="python"):
        limit = self.limit.model_dump() if hasattr(self.limit, "model_dump") else self.limit
        return {
            "service": {"id": self.service.id},
            "limit": limit,
            "header_overrides": self.header_overrides,
        }

    @classmethod
    async def get(cls, rule_id: str):
        return cls.store.get(rule_id)

    @classmethod
    def find_all(cls):
        return FakeQuery(list(cls.store.values()))

    @classmethod
    def find(cls, *_args, **_kwargs):
        def clear_rules():
            cls.store.clear()

        return FakeQuery(list(cls.store.values()), on_delete=clear_rules)

    async def insert(self):
        FakeRuleConfig.store[self.id] = self

    async def save(self):
        FakeRuleConfig.store[self.id] = self

    async def delete(self):
        FakeRuleConfig.store.pop(self.id, None)

    def update(self, payload: dict):
        for key, value in payload.items():
            setattr(self, key, value)

    def to_response(self):
        limit = self.limit.model_dump() if hasattr(self.limit, "model_dump") else self.limit
        return {
            "id": self.id,
            "service_id": self.service.id,
            "name": self.name,
            "path_pattern": self.path_pattern,
            "limit": limit,
            "priority": self.priority,
            "header_overrides": self.header_overrides,
            "enabled": self.enabled,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


@pytest.fixture()
def mocked_config_db(monkeypatch: pytest.MonkeyPatch):
    FakeServiceConfig.store = {}
    FakeServiceConfig.next_id = 1
    FakeRuleConfig.store = {}
    FakeRuleConfig.next_id = 1

    monkeypatch.setattr(config_router, "ServiceConfig", FakeServiceConfig)
    monkeypatch.setattr(config_router, "RuleConfig", FakeRuleConfig)


def test_services_and_rules_endpoints(client: TestClient, mocked_config_db) -> None:
    created_service = client.post(
        "/api/config/services",
        json={"tenant_id": "tenant-1", "url": "https://svc.local", "description": "Products API"},
    )
    assert created_service.status_code == 201
    service_id = created_service.json()["id"]

    listed_services = client.get("/api/config/services")
    assert listed_services.status_code == 200
    assert len(listed_services.json()) == 1

    created_rule = client.post(
        "/api/config/rules",
        json={
            "service_id": service_id,
            "name": "products",
            "path_pattern": "/products",
            "limit": {"enabled": True, "requests": 10, "window_seconds": 60},
            "priority": 100,
            "header_overrides": [],
        },
    )
    assert created_rule.status_code == 201
    rule_id = created_rule.json()["id"]

    listed_rules = client.get("/api/config/rules")
    assert listed_rules.status_code == 200
    assert len(listed_rules.json()) == 1

    updated_rule = client.put(
        f"/api/config/rules/{rule_id}",
        json={
            "service_id": service_id,
            "name": "products-updated",
            "path_pattern": "/products",
            "limit": {"enabled": True, "requests": 20, "window_seconds": 60},
            "priority": 10,
            "header_overrides": [],
        },
    )
    assert updated_rule.status_code == 200
    assert updated_rule.json()["priority"] == 10

    deleted_rule = client.delete(f"/api/config/rules/{rule_id}")
    assert deleted_rule.status_code == 204

    deleted_service = client.delete(f"/api/config/services/{service_id}")
    assert deleted_service.status_code == 204
