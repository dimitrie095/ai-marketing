"""
FastAPI Application - Marketing Analytics AI
Main entry point for the backend API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Logging-Konfiguration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# -------------------------------
# Database import (safe import)
# -------------------------------
db_available = False

try:
    from app.db import init_database, close_database
    db_available = True
    logger.info("✅ Database module imported successfully")
except Exception as e:
    logger.warning(f"⚠️  Database module not available: {e}")
    logger.warning("   Starting without database support...")
    db_available = False

# -------------------------------
# Lifespan-Event handler
# -------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("🚀 Starting up Marketing Analytics AI...")

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

    yield

    # Cleanup
    if db_available:
        await close_database()
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
    allow_origins=["http://localhost:3000"],  # Next.js Frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# Health Check Endpoint
# -------------------------------
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "marketing-analytics-api",
        "version": "1.0.0",
        "database": db_available
    }

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