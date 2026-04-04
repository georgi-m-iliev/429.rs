"""Config router — CRUD for services and rules stored in MongoDB."""
import datetime

from fastapi import APIRouter, HTTPException

from app.db import RuleConfig, ServiceConfig
from app.schemas import RuleCreate, RuleResponse, RuleUpdate, ServiceCreate, ServiceUpdate, ServiceResponse

router = APIRouter()


@router.get("/services", response_model=list[ServiceResponse])
async def list_services(tenant_id: str | None = None):
    if tenant_id:
        query = ServiceConfig.find(ServiceConfig.tenant_id == tenant_id, fetch_links=True)
    else:
        query = ServiceConfig.find_all(fetch_links=True)
    
    services = await query.to_list()
    return [service.to_response() for service in services]


@router.post("/services", response_model=ServiceResponse, status_code=201)
async def create_service(payload: ServiceCreate):
    exists = await ServiceConfig.find_one(ServiceConfig.url == payload.url, fetch_links=True)
    if exists:
        raise HTTPException(status_code=409, detail=f"Service '{payload.url}' already exists")

    service = ServiceConfig(**payload.model_dump())
    await service.insert()
    return service.to_response()


@router.put("/services/{service_id}", response_model=ServiceResponse)
async def update_service(service_id: str, payload: ServiceUpdate):
    service = await ServiceConfig.get(service_id, fetch_links=True)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    update_data = payload.model_dump(exclude_unset=True)
    await service.set(update_data)
    
    service.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
    await service.save()
    return service.to_response()


@router.delete("/services/{service_id}", status_code=204)
async def delete_service(service_id: str):
    service = await ServiceConfig.get(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    await RuleConfig.find(RuleConfig.service.id == service.id).delete()
    await service.delete()


@router.get("/rules", response_model=list[RuleResponse])
async def list_rules(service_id: str):
    rules = await RuleConfig.find(RuleConfig.service.id == service_id, fetch_links=True).to_list()
    return [rule.to_response() for rule in rules]


@router.post("/rules", response_model=RuleResponse, status_code=201)
async def create_rule(payload: RuleCreate):
    service = await ServiceConfig.get(payload.service_id)
    if not service:
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
    rule = await RuleConfig.get(rule_id, fetch_links=True)
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")

    if payload.service_id is not None:
        service = await ServiceConfig.get(payload.service_id)
        if service is None:
            raise HTTPException(status_code=404, detail="Service not found")

    update_data = payload.model_dump(exclude_unset=True)
    await rule.set(update_data)

    rule.updated_at = datetime.datetime.now(tz=datetime.timezone.utc)
    await rule.save()
    return rule.to_response()


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(rule_id: str):
    rule = await RuleConfig.get(rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    await rule.delete()
