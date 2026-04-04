from functools import lru_cache

from pydantic import RedisDsn, MongoDsn
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Settings for the BFF service."""

    cors_origins: list[str] = ["*"]
    redis_url: RedisDsn = "redis://localhost:6379/0"
    mongo_url: MongoDsn = "mongodb://localhost:27017"
    mongo_db_name: str = "rate_limiter_config"


@lru_cache()
def get_settings():
    """Get the settings for the BFF service."""
    return Settings()
