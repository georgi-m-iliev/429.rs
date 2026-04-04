import datetime

from pydantic import AnyHttpUrl, BaseModel, Field


class LimitSchema(BaseModel):
	enabled: bool = True
	requests: int = Field(..., ge=1)
	window_seconds: int = Field(..., ge=1)


class HeaderOverrideSchema(BaseModel):
	header_name: str = Field(..., min_length=1)
	header_value: str = Field(..., min_length=1)
	limit: LimitSchema


class RuleCreate(BaseModel):
    service_id: str
    name: str = Field(..., min_length=1)
    path_pattern: str = Field(..., min_length=1)
    limit: LimitSchema
    priority: int = Field(default=100, ge=0)
    header_overrides: list[HeaderOverrideSchema] = Field(default_factory=list)


class RuleUpdate(BaseModel):
    service_id: str | None = None
    name: str | None = Field(default=None, min_length=1)
    path_pattern: str | None = Field(default=None, min_length=1)
    limit: LimitSchema | None
    priority: int | None = Field(default=None, ge=0)
    header_overrides: list[HeaderOverrideSchema] | None = None


class RuleResponse(RuleCreate):
    id: str
    enabled: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime


class ServiceCreate(BaseModel):
    tenant_id: str = Field(..., min_length=1)
    url: AnyHttpUrl
    description: str | None = None


class ServiceUpdate(BaseModel):
    url: AnyHttpUrl | None
    description: str | None = None
    enabled: bool | None = None


class ServiceResponse(ServiceCreate):
    id: str
    enabled: bool
    rules: list[RuleResponse]
    created_at: datetime.datetime
    updated_at: datetime.datetime