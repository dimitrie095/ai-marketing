"""
API Router Module
Registriert alle API Endpoints
"""

from fastapi import APIRouter
from .kpi import router as kpi_router
from .meta import router as meta_router

# Haupt-Router erstellen
api_router = APIRouter(prefix="/api/v1")

# Sub-Router registrieren
api_router.include_router(kpi_router, tags=["kpi"])
api_router.include_router(meta_router, tags=["meta"])

__all__ = ["api_router"]