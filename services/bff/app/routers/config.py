"""
Config router — CRUD for rate-limit rules stored in Redis.
"""
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.redis_client import get_redis

router = APIRouter()

CONFIG_KEY = "rl:config:rules"


class RateLimitRule(BaseModel):
    id: str = Field(..., description="Unique rule identifier")
    path: str = Field(..., description="URL path pattern to match, e.g. /api/*")
    limit: int = Field(..., ge=1, description="Maximum requests allowed in the window")
    window_seconds: int = Field(..., ge=1, description="Time window in seconds")
    enabled: bool = Field(default=True)


@router.get("/rules", response_model=list[RateLimitRule])
async def list_rules():
    """Return all configured rate-limit rules."""
    r = get_redis()
    raw = await r.get(CONFIG_KEY)
    if not raw:
        return []
    return [RateLimitRule(**rule) for rule in json.loads(raw)]


@router.post("/rules", response_model=RateLimitRule, status_code=201)
async def create_rule(rule: RateLimitRule):
    """Create a new rate-limit rule."""
    r = get_redis()
    raw = await r.get(CONFIG_KEY)
    rules: list[dict] = json.loads(raw) if raw else []

    if any(existing["id"] == rule.id for existing in rules):
        raise HTTPException(status_code=409, detail=f"Rule '{rule.id}' already exists")

    rules.append(rule.model_dump())
    await r.set(CONFIG_KEY, json.dumps(rules))
    return rule


@router.put("/rules/{rule_id}", response_model=RateLimitRule)
async def update_rule(rule_id: str, rule: RateLimitRule):
    """Update an existing rate-limit rule."""
    r = get_redis()
    raw = await r.get(CONFIG_KEY)
    rules: list[dict] = json.loads(raw) if raw else []

    for i, existing in enumerate(rules):
        if existing["id"] == rule_id:
            rules[i] = rule.model_dump()
            await r.set(CONFIG_KEY, json.dumps(rules))
            return rule

    raise HTTPException(status_code=404, detail=f"Rule '{rule_id}' not found")


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(rule_id: str):
    """Delete a rate-limit rule."""
    r = get_redis()
    raw = await r.get(CONFIG_KEY)
    rules: list[dict] = json.loads(raw) if raw else []

    updated = [r_ for r_ in rules if r_["id"] != rule_id]
    if len(updated) == len(rules):
        raise HTTPException(status_code=404, detail=f"Rule '{rule_id}' not found")

    await r.set(CONFIG_KEY, json.dumps(updated))
