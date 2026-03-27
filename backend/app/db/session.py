"""
MongoDB session management for FastAPI
Supports async MongoDB connection with motor and Beanie ODM
"""

import os
from typing import AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient

# Database URL from environment
MONGODB_URL = os.getenv(
    "MONGODB_URL",
    "mongodb://localhost:27017/marketing_ai"
)

# Database name can be extracted from URL or set separately
DATABASE_NAME = os.getenv("DATABASE_NAME", "marketing_ai")

# Global client variable
client: AsyncIOMotorClient = None

# Import Beanie only when needed - delay to avoid Pydantic issues
_init_lock = False
_models_initialized = False

async def init_beanie_if_needed():
    """Initialize Beanie with lazy loading to avoid Pydantic import issues"""
    global _init_lock, _models_initialized
    
    if _models_initialized or _init_lock:
        return
    
    _init_lock = True
    
    try:
        from beanie import init_beanie
        from .models import Campaign, AdSet, Ad, Metric, ProcessedData, RawData, MetaInsights, GoogleAdsReport, User
        from .models_llm import LLMProvider, LLMConfig, Conversation, Message, SyncJob, PromptTemplate
        
        # Initialize Beanie with all document models
        await init_beanie(
            database=client[DATABASE_NAME],
            document_models=[
                Campaign,
                AdSet,
                Ad,
                Metric,
                ProcessedData,
                RawData,
                MetaInsights,
                GoogleAdsReport,
                LLMProvider,
                LLMConfig,
                Conversation,
                Message,
                SyncJob,
                PromptTemplate,
                User
            ]
        )
        print("[OK] Beanie ODM initialized successfully")
        _models_initialized = True
        
    except Exception as e:
        print(f"❌ Beanie initialization failed: {e}")
        # Don't raise - allow the app to continue without database
        _models_initialized = False
    finally:
        _init_lock = False

async def init_database():
    """Initialize MongoDB connection and Beanie ODM"""
    global client
    
    try:
        # Create MongoDB client
        client = AsyncIOMotorClient(
            MONGODB_URL,
            serverSelectionTimeoutMS=5000,
            maxPoolSize=20,
            minPoolSize=5
        )
        
        # Test connection
        await client.admin.command('ping')
        print("✅ MongoDB connection established successfully")
        
        # Initialize Beanie (delayed to avoid Pydantic issues)
        await init_beanie_if_needed()
        
        # Create indexes only if Beanie initialized successfully
        if _models_initialized:
            await create_indexes()
        else:
            print("⚠️  Skipping index creation - Beanie not initialized")
        
    except Exception as e:
        print(f"❌ MongoDB initialization failed: {e}")
        # Set client to None to indicate database is not available
        client = None
        print("⚠️  Continuing without database connection")

async def create_indexes():
    """Create MongoDB indexes for better performance"""
    try:
        db = client[DATABASE_NAME]
        
        # Campaign indexes
        try:
            await db.campaigns.create_index("status")
            await db.campaigns.create_index("updated_at")
        except Exception:
            pass
        
        # AdSet indexes
        try:
            await db.ad_sets.create_index("campaign_id")
            await db.ad_sets.create_index("status")
            await db.ad_sets.create_index("updated_at")
        except Exception:
            pass
        
        # Ad indexes
        try:
            await db.ads.create_index("ad_set_id")
            await db.ads.create_index("status")
            await db.ads.create_index("updated_at")
            await db.ads.create_index("creative_type")
        except Exception:
            pass
        
        # Metric indexes - compound index on entity_type, entity_id, date
        # Skip if index already exists with different properties
        try:
            await db.metrics.create_index([
                ("entity_type", 1),
                ("entity_id", 1),
                ("date", 1)
            ], unique=True)
        except Exception:
            # Index may already exist without unique constraint
            pass
        try:
            await db.metrics.create_index("date")
            await db.metrics.create_index("entity_id")
        except Exception:
            pass
        
        # Processed data indexes
        try:
            await db.processed_data.create_index("campaign_id")
            await db.processed_data.create_index("date")
        except Exception:
            pass
        try:
            await db.processed_data.create_index([
                ("campaign_id", 1),
                ("date", 1)
            ], unique=True)
        except Exception:
            pass
        
        # Raw data indexes
        try:
            await db.raw_data.create_index("campaign_id")
            await db.raw_data.create_index("date")
        except Exception:
            pass
        try:
            await db.raw_data.create_index([
                ("campaign_id", 1),
                ("date", 1)
            ], unique=True)
        except Exception:
            pass
        
        # Meta Insights indexes
        try:
            await db.meta_insights.create_index("campaign_id")
            await db.meta_insights.create_index("date_start")
            await db.meta_insights.create_index("date_stop")
        except Exception:
            pass
        
        # Google Ads Report indexes  
        try:
            await db.google_ads_reports.create_index("campaign_id")
            await db.google_ads_reports.create_index("segments_date")
        except Exception:
            pass
        
        # User indexes
        try:
            await db.users.create_index("username", unique=True)
            await db.users.create_index("email", unique=True)
            await db.users.create_index("is_active")
        except Exception:
            pass
        
        print("✅ MongoDB indexes created successfully")
        
    except Exception as e:
        print(f"⚠️  Index creation warning: {e}")

async def close_database():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        print("✅ MongoDB connection closed")

# Database dependency for FastAPI
async def get_db() -> AsyncGenerator:
    """FastAPI dependency for database operations"""
    global client
    if not client:
        try:
            await init_database()
        except Exception as e:
            print(f"⚠️  Database not available: {e}")
            client = None
    yield client

def get_database_name() -> str:
    """Get current database name"""
    return DATABASE_NAME

# Flag to indicate if database is available
def is_db_available() -> bool:
    """Check if database connection is available"""
    return client is not None and _models_initialized