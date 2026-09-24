"""
FastAPI application factory and main entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.init_db import init_db

# ── API v1 Routers ────────────────────────────────────────────────────────────
from app.api.v1.endpoints import (
    auth,
    users,
    properties,
    tenants,
    leases,
    payments,
    maintenance,
    dashboard,
    invites,
)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        description="REST API for Affordable Housing & Rental Management",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # ── CORS ─────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Startup ───────────────────────────────────────────────────────────────
    @app.on_event("startup")
    def on_startup() -> None:
        init_db()

    # ── Health ────────────────────────────────────────────────────────────────
    @app.get("/health", tags=["Health"])
    def health_check():
        return {"status": "ok", "app": settings.APP_NAME, "version": "1.0.0"}

    # ── API v1 ────────────────────────────────────────────────────────────────
    app.include_router(auth.router,        prefix="/api/v1/auth",        tags=["Auth"])
    app.include_router(users.router,       prefix="/api/v1/users",       tags=["Users"])
    app.include_router(properties.router,  prefix="/api/v1",             tags=["Properties"])
    app.include_router(tenants.router,     prefix="/api/v1",             tags=["Tenants"])
    app.include_router(leases.router,      prefix="/api/v1",             tags=["Leases"])
    app.include_router(payments.router,    prefix="/api/v1",             tags=["Payments"])
    app.include_router(maintenance.router, prefix="/api/v1",             tags=["Maintenance"])
    app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
    app.include_router(invites.router,     prefix="/api/v1",             tags=["Invitations"])

    return app


app = create_app()
