"""
BFF (Backend For Frontend) Service
Handles configuration management and metrics for the 429.rs rate limiter.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import config, metrics
from app.settings import get_settings
from app.db import close as close_db
from app.db import init as init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield
    await close_db()

app = FastAPI(
    title="429.rs BFF",
    description="Backend For Frontend — manages rate-limit configuration and exposes metrics",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "bff"}
