import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.middleware.tenant import TenantMiddleware
from app.api import (
    agent, ai, attendance, auth, cash, devices, drivers,
    inspections, locations, maintenance, orders, reports,
    settings as settings_api, shifts, tickets, users, vehicles,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle: APScheduler."""
    from app.ai.scheduler import scheduler, setup_scheduler
    setup_scheduler()
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="FleetPulse API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Middleware ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TenantMiddleware)

# ── Static files for local uploads ──
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# ── Routers ──
app.include_router(auth.router)
app.include_router(drivers.router)
app.include_router(devices.router)
app.include_router(shifts.router)
app.include_router(attendance.router)
app.include_router(vehicles.router)
app.include_router(maintenance.router)
app.include_router(orders.router)
app.include_router(locations.router)
app.include_router(cash.router)
app.include_router(inspections.router)
app.include_router(tickets.router)
app.include_router(ai.router)
app.include_router(reports.router)
app.include_router(settings_api.router)
app.include_router(users.router)
app.include_router(agent.router)


# ── Error Handlers ──
@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=409,
        content={"detail": "Database integrity error. The record may already exist."},
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    if settings.DEBUG:
        return JSONResponse(status_code=500, content={"detail": str(exc)})
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ── Health ──
@app.get("/health")
async def health():
    return {"status": "ok", "service": "fleetpulse-api", "version": "2.0.0"}
