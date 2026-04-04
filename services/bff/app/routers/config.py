"""Config router — CRUD for services and rules stored in MongoDB."""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db import RuleConfig, ServiceConfig
from app.schemas import RuleCreate, RuleResponse, RuleUpdate, ServiceCreate, ServiceResponse

router = APIRouter()

async def _service_rules(service_id: str) -> list[RuleResponse]:
    rules = await RuleConfig.find(RuleConfig.service.id == service_id).to_list()
    return [rule.to_response() for rule in rules]


@router.get("/services", response_model=list[ServiceResponse])
async def list_services(tenant_id: str | None = None):
    query = ServiceConfig.find_all() if tenant_id is None else ServiceConfig.find(ServiceConfig.tenant_id == tenant_id)
    services = await query.to_list()
    response: list[ServiceResponse] = []
    for service in services:
        rules = await _service_rules(str(service.id))
        response.append(service.to_response())
    return response


@router.post("/services", response_model=ServiceResponse, status_code=201)
async def create_service(payload: ServiceCreate):
    exists = await ServiceConfig.find_one(ServiceConfig.url == payload.url)
    if exists is not None:
        raise HTTPException(status_code=409, detail=f"Service '{payload.url}' already exists")

    service = ServiceConfig(**payload.model_dump())
    await service.insert()
    return service.to_response()


@router.delete("/services/{service_id}", status_code=204)
async def delete_service(service_id: str):
    service = await ServiceConfig.get(service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")

    await RuleConfig.find(RuleConfig.service.id == service.id).delete()
    await service.delete()


@router.get("/rules", response_model=list[RuleResponse])
async def list_rules(service_id: str | None = None):
    if service_id is None:
        rules = await RuleConfig.find_all().to_list()
    else:
        rules = await RuleConfig.find(RuleConfig.service.id == service_id).to_list()
    return [rule.to_response() for rule in rules]


@router.post("/rules", response_model=RuleResponse, status_code=201)
async def create_rule(payload: RuleCreate):
    service = await ServiceConfig.get(payload.service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")

    rule = RuleConfig(
        service=service,
        name=payload.name,
        path_pattern=payload.path_pattern,
        limit=payload.limit,
        priority=payload.priority,
        header_overrides=payload.header_overrides,
    )
    await rule.insert()
    return rule.to_response()


@router.put("/rules/{rule_id}", response_model=RuleResponse)
async def update_rule(rule_id: str, payload: RuleUpdate):
    rule = await RuleConfig.get(rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")

    service = await ServiceConfig.get(payload.service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")

    rule.update(payload.model_dump(exclude_unset=True))

    await rule.save()
    return rule.to_response()


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(rule_id: str):
    rule = await RuleConfig.get(rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    await rule.delete()
