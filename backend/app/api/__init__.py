"""
API Router Module
Registriert alle API Endpoints
"""

from fastapi import APIRouter

# Haupt-Router erstellen
api_router = APIRouter(prefix="/api/v1")

# KPI Router (always available with fallback)
from .kpi import router as kpi_router
api_router.include_router(kpi_router, tags=["kpi"])

# Analytics Router
from .analytics import router as analytics_router
api_router.include_router(analytics_router, tags=["analytics"])

# Try to import other routers (may fail if DB not available)
try:
    from .meta import router as meta_router
    api_router.include_router(meta_router, tags=["meta"])
except ImportError:
    pass

try:
    from .campaigns import router as campaigns_router
    api_router.include_router(campaigns_router, tags=["campaigns"])
except ImportError:
    pass

try:
    from .llm import router as llm_router
    api_router.include_router(llm_router, tags=["LLM"])
except ImportError:
    pass

try:
    from .llm_config import router as llm_config_router
    api_router.include_router(llm_config_router, tags=["LLM Config"])
except ImportError:
    pass

try:
    from .agents import router as agents_router
    api_router.include_router(agents_router, tags=["AI Agents"])
except ImportError:
    pass

try:
    from .chat import router as chat_router
    api_router.include_router(chat_router, tags=["Chat"])
except ImportError:
    pass

try:
    from .audience import router as audience_router
    api_router.include_router(audience_router, tags=["Audience"])
except ImportError:
    pass

__all__ = ["api_router"]