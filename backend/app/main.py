"""
FastAPI Application - Marketing Analytics AI
Main entry point for the backend API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from dotenv import load_dotenv
# Added comment to trigger reload

# Load environment variables
load_dotenv()

# Logging-Konfiguration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Import API Router
from app.api import api_router

# -------------------------------
# Database import (safe import)
# -------------------------------
db_available = False
llm_available = False
agents_available = False

try:
    from app.db import init_database, close_database
    db_available = True
    logger.info("[OK] Database module imported successfully")
except Exception as e:
    logger.warning(f"⚠️  Database module not available: {e}")
    logger.warning("   Starting without database support...")
    db_available = False

# -------------------------------
# LLM Gateway import (safe import)
# -------------------------------
try:
    from app.llm import llm_gateway, config_manager
    llm_available = True
    logger.info("✅ LLM Gateway module imported successfully")
except Exception as e:
    logger.warning(f"⚠️  LLM Gateway not available: {e}")
    logger.warning("   Starting without LLM support...")
    llm_available = False

# -------------------------------
# AI Agents import (safe import)
# -------------------------------
try:
    from app.agents import initialize_agents
    agents_available = True
    logger.info("✅ AI Agents module imported successfully")
except Exception as e:
    logger.warning(f"⚠️  AI Agents not available: {e}")
    logger.warning("   Starting without AI Agents...")
    agents_available = False

# -------------------------------
# Lifespan-Event handler
# -------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("🚀 Starting up Marketing Analytics AI...")

    agents_initialized = False
    
    if db_available:
        # Initialize MongoDB connection
        try:
            await init_database()
            logger.info("✅ MongoDB connection successful")
        except Exception as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            logger.warning("Continuing without database...")
    else:
        logger.warning("⚠️ Database module not available. Skipping DB connection test.")

    # Initialize LLM Gateway from DB only
    if llm_available:
        try:
            configs = await config_manager.load_configs_from_db()
            if configs:
                result = await llm_gateway.initialize(configs)
                logger.info(f"✅ LLM Gateway initialized: {result}")
            else:
                logger.warning("⚠️ No active LLM config found in DB — gateway not initialized")
        except Exception as e:
            logger.error(f"❌ LLM Gateway initialization failed: {e}")
            logger.warning("Continuing without LLM support...")
    else:
        logger.warning("⚠️ LLM module not available. Skipping LLM init.")

    # Initialize AI Agents
    if db_available and llm_available:
        try:
            from app.agents import initialize_agents
            await initialize_agents()
            agents_initialized = True
            logger.info("✅ AI Agents initialized")
        except Exception as e:
            logger.error(f"❌ AI Agents initialization failed: {e}")
    else:
        logger.warning("⚠️ Skipping agents initialization (DB or LLM not available)")

    yield

    # Cleanup
    if db_available:
        await close_database()
    if llm_available:
        # LLM Gateway benötigt keine explizite Cleanup
        pass
    
    logger.info("⛔ Shutting down Marketing Analytics AI...")

# -------------------------------
# FastAPI App erstellen
# -------------------------------
app = FastAPI(
    title="Marketing Analytics AI API",
    description="AI-powered marketing analytics with Multi-LLM support",
    version="1.0.0",
    lifespan=lifespan
)

# -------------------------------
# CORS Middleware hinzufügen
# -------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js Frontend
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# API Router registrieren
# -------------------------------
app.include_router(api_router)

# -------------------------------
# Health Check Endpoint
# -------------------------------
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    try:
        llm_status = "unavailable"
        agents_status = "unavailable"
        chat_status = "unavailable"
        llm_providers_count = 0
        
        if llm_available:
            try:
                providers = llm_gateway.list_available_providers()
                llm_providers_count = len(providers)
                llm_status = "healthy" if llm_providers_count > 0 else "degraded"
                chat_status = "healthy" if llm_providers_count > 0 else "degraded"
            except Exception as e:
                logger.error(f"Error in LLM gateway: {e}", exc_info=True)
                llm_status = "error"
                chat_status = "error"
        
        # Agents are available if LLM and DB are available
        if db_available and agents_available and llm_status == "healthy":
            agents_status = "healthy"
        else:
            agents_status = "unavailable"
        
        return {
            "status": "healthy",
            "service": "marketing-analytics-api",
            "version": "1.0.0",
            "database": db_available,
            "llm": llm_status,
            "llm_providers": llm_providers_count,
            "agents": agents_status,
            "chat": chat_status
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------
# Root Endpoint
# -------------------------------
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API Information"""
    return {
        "message": "Marketing Analytics AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "database": db_available
    }

# -------------------------------
# Run with uvicorn if main
# -------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )