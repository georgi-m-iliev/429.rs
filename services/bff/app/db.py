import datetime

from beanie import init_beanie, Document, Link, BackLink
from pymongo import ASCENDING, IndexModel
from pymongo import AsyncMongoClient
from pydantic import AnyHttpUrl, Field

from app.settings import get_settings
from app.schemas import HeaderOverrideSchema, LimitSchema, RuleResponse, ServiceResponse

settings = get_settings()
_mongo_client: AsyncMongoClient | None = None


def utc_now() -> datetime.datetime:
    return datetime.datetime.now(tz=datetime.timezone.utc)


class RuleConfig(Document):
    service: Link["ServiceConfig"]
    enabled: bool = True
    name: str = Field(..., min_length=1)
    path_pattern: str = Field(..., min_length=1, description="Path pattern, e.g. /api/*")
    limit: LimitSchema
    priority: int = Field(default=100, ge=0, description="Lower numbers have higher priority")
    header_overrides: list[HeaderOverrideSchema] = Field(default_factory=list)
    created_at: datetime.datetime = Field(default_factory=utc_now)
    updated_at: datetime.datetime = Field(default_factory=utc_now)

    class Settings:
        name = "rules"
        indexes = [
            IndexModel([("service.$id", ASCENDING), ("enabled", ASCENDING)]),
            IndexModel([("service.$id", ASCENDING), ("path_pattern", ASCENDING), ("priority", ASCENDING)]),
            IndexModel([("updated_at", ASCENDING)]),
        ]

    def to_response(self) -> RuleResponse:
        return RuleResponse(
            id=str(self.id),
            service_id=str(self.service.id),
            name=self.name,
            path_pattern=self.path_pattern,
            limit=self.limit,
            priority=self.priority,
            header_overrides=self.header_overrides,
            enabled=self.enabled,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


class ServiceConfig(Document):
    tenant_id: str = Field(..., min_length=1)
    enabled: bool = True
    url: AnyHttpUrl
    description: str | None = None
    rules: list[BackLink[RuleConfig]] = Field(default_factory=list, original_field="service")
    created_at: datetime.datetime = Field(default_factory=utc_now)
    updated_at: datetime.datetime = Field(default_factory=utc_now)

    class Settings:
        name = "services"
        indexes = [
            IndexModel([("url", ASCENDING)], unique=True),
            IndexModel([("tenant_id", ASCENDING), ("enabled", ASCENDING)]),
            IndexModel([("updated_at", ASCENDING)]),
        ]

    def to_response(self) -> ServiceResponse:
        rules = self.rules if isinstance(self.rules, list) else []
        resolved_rules = [rule for rule in rules if hasattr(rule, "to_response")]
        return ServiceResponse(
            id=str(self.id),
            tenant_id=self.tenant_id,
            url=self.url,
            description=self.description,
            enabled=self.enabled,
            rules=[rule.to_response() for rule in resolved_rules],
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


async def init():
    global _mongo_client
    if _mongo_client is not None:
        return

    _mongo_client = AsyncMongoClient(str(settings.mongo_url))
    database = _mongo_client.get_database(settings.mongo_db_name)
    await init_beanie(database=database, document_models=[ServiceConfig, RuleConfig])


async def close():
    global _mongo_client
    if _mongo_client is None:
        return

    await _mongo_client.close()
    _mongo_client = None
