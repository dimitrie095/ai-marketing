"""
FastAPI Application - Marketing Analytics AI (SYNC VERSION)
Synchronous version without async database requirements
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Import synchronous database module
from app.db import session_sync

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("🚀 Starting up Marketing Analytics AI (Sync Version)...")
    
    # Test database connection
    try:
        if session_sync.engine:
            success = session_sync.test_connection()
            if success:
                logger.info("✅ Database connection successful")
            else:
                logger.warning("⚠️ Database connection test failed")
        else:
            logger.warning("⚠️ No database engine available - running in API-only mode")
    except Exception as e:
        logger.error(f"❌ Database initialization error: {e}")
        logger.warning("Continuing without database...")
    
    yield
    
    # Cleanup
    logger.info("⛔ Shutting down Marketing Analytics AI...")

# Create FastAPI app
app = FastAPI(
    title="Marketing Analytics AI API (Sync)",
    description="AI-powered marketing analytics with Multi-LLM support (Synchronous Version)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # Next.js Frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import database dependency
from app.db.session_sync import get_db

# Import API routers (will be added later)
# from app.api import campaigns, metrics, chat, etc.

# Basic endpoints
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API Information"""
    return {
        "message": "Marketing Analytics AI API (Sync Version)",
        "version": "1.0.0",
        "database": "available" if session_sync.engine else "not_available",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    db_status = "healthy" if session_sync.engine else "unavailable"
    
    # Test database if available
    if session_sync.engine:
        try:
            with session_sync.engine.connect() as conn:
                conn.execute("SELECT 1")
            db_status = "healthy"
        except Exception as e:
            db_status = f"unhealthy: {str(e)[:100]}"
    
    return {
        "status": "healthy",
        "service": "marketing-analytics-api-sync",
        "version": "1.0.0",
        "database": db_status,
        "mode": "synchronous"
    }

@app.get("/api/test-db", tags=["Database"])
async def test_database():
    """Test database connection endpoint"""
    if not session_sync.engine:
        return {
            "status": "error",
            "message": "Database engine not available",
            "solution": "Install psycopg2-binary or pg8000: pip install psycopg2-binary"
        }
    
    try:
        with session_sync.engine.connect() as conn:
            result = conn.execute("SELECT version(), current_timestamp")
            row = result.fetchone()
            version = row[0]
            timestamp = row[1]
        
        return {
            "status": "success",
            "message": "Database connection successful",
            "postgres_version": version,
            "server_time": str(timestamp),
            "engine": str(session_sync.engine.url)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": "Database connection failed",
            "error": str(e),
            "solution": "Check DATABASE_URL in .env file"
        }

# Example endpoint with database access
@app.get("/api/tables", tags=["Database"])
async def list_tables():
    """List all tables in the database"""
    if not session_sync.engine:
        return {
            "tables": [],
            "message": "Database not available"
        }
    
    try:
        with session_sync.engine.connect() as conn:
            result = conn.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            tables = [row[0] for row in result.fetchall()]
        
        return {
            "tables": tables,
            "count": len(tables),
            "status": "success"
        }
    except Exception as e:
        return {
            "tables": [],
            "error": str(e),
            "status": "error"
        }

# Future endpoints will be added here:
# app.include_router(campaigns.router, prefix="/api/campaigns", tags=["Campaigns"])
# app.include_router(metrics.router, prefix="/api/metrics", tags=["Metrics"])
# app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

if __name__ == "__main__":
    import uvicorn
    
    # Print startup info
    print("=" * 60)
    print("Marketing Analytics AI - Sync Version")
    print("=" * 60)
    print(f"Database URL: {os.getenv('DATABASE_URL', 'not set')}")
    print(f"Database Engine: {'Available' if session_sync.engine else 'Not available'}")
    print(f"Server: http://localhost:8000")
    print(f"Docs: http://localhost:8000/docs")
    print("=" * 60)
    
    uvicorn.run(
        "app.main_sync:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )