"""
BFF (Backend For Frontend) Service
Handles configuration management and metrics for the 429.rs rate limiter.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import config, metrics

app = FastAPI(
    title="429.rs BFF",
    description="Backend For Frontend — manages rate-limit configuration and exposes metrics",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "bff"}
