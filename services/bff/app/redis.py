"""
Redis client singleton for the BFF service.
"""
import os
from functools import lru_cache

import redis.asyncio as redis

from app.settings import get_settings

settings = get_settings()


@lru_cache()
def get_redis() -> redis.Redis:
    return redis.from_url(str(settings.redis_url), decode_responses=True)
