"""
FastAPI application entry point.
Vannamei Shrimp Profit Optimizer — Backend API.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers.auth import router as auth_router
from app.routers.ponds import router as ponds_router
from app.routers.daily_logs import router as daily_logs_router
from app.routers.analytics import (
    analytics_router,
    feed_router,
    alerts_router,
    harvest_router,
)
from app.routers.prices import router as prices_router
from app.routers.iot import router as iot_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables. Shutdown: cleanup."""
    await init_db()
    yield


app = FastAPI(
    title="🦐 Vannamei Shrimp Profit Optimizer",
    description="Smart analytics platform for shrimp farmers to maximize profit.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(ponds_router)
app.include_router(daily_logs_router)
app.include_router(analytics_router)
app.include_router(feed_router)
app.include_router(alerts_router)
app.include_router(harvest_router)
app.include_router(prices_router)
app.include_router(iot_router)


@app.get("/api/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "vannamei-optimizer"}
