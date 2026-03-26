"""
API Router Module
Registriert alle API Endpoints
"""

from fastapi import APIRouter
from .kpi import router as kpi_router
from .meta import router as meta_router
from .campaigns import router as campaigns_router
from .llm import router as llm_router
from .llm_config import router as llm_config_router
from .agents import router as agents_router
from .chat import router as chat_router

# Haupt-Router erstellen
api_router = APIRouter(prefix="/api/v1")

# Sub-Router registrieren
api_router.include_router(kpi_router, tags=["kpi"])
api_router.include_router(meta_router, tags=["meta"])
api_router.include_router(campaigns_router, tags=["campaigns"])
api_router.include_router(llm_router, tags=["LLM"])
api_router.include_router(llm_config_router, tags=["LLM Config"])
api_router.include_router(agents_router, tags=["AI Agents"])
api_router.include_router(chat_router, tags=["Chat"])

__all__ = ["api_router"]