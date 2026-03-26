"""
MongoDB session management for FastAPI
Supports async MongoDB connection with motor and Beanie ODM
"""

import os
from typing import AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from .models import Campaign, AdSet, Ad, Metric, ProcessedData, RawData, MetaInsights, GoogleAdsReport

# Database URL from environment
MONGODB_URL = os.getenv(
    "MONGODB_URL",
    "mongodb://localhost:27017/marketing_ai"
)

# Database name can be extracted from URL or set separately
DATABASE_NAME = os.getenv("DATABASE_NAME", "marketing_ai")

# Global client variable
client: AsyncIOMotorClient = None

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
                GoogleAdsReport
            ]
        )
        print("✅ Beanie ODM initialized successfully")
        
        # Create indexes
        await create_indexes()
        
    except Exception as e:
        print(f"❌ MongoDB initialization failed: {e}")
        raise

async def create_indexes():
    """Create MongoDB indexes for better performance"""
    try:
        db = client[DATABASE_NAME]
        
        # Campaign indexes
        await db.campaigns.create_index("status")
        await db.campaigns.create_index("updated_at")
        
        # AdSet indexes
        await db.ad_sets.create_index("campaign_id")
        await db.ad_sets.create_index("status")
        await db.ad_sets.create_index("updated_at")
        
        # Ad indexes
        await db.ads.create_index("ad_set_id")
        await db.ads.create_index("status")
        await db.ads.create_index("updated_at")
        await db.ads.create_index("creative_type")
        
        # Metric indexes - compound index on entity_type, entity_id, date
        await db.metrics.create_index([
            ("entity_type", 1),
            ("entity_id", 1),
            ("date", 1)
        ], unique=True)
        await db.metrics.create_index("date")
        await db.metrics.create_index("entity_id")
        
        # Processed data indexes
        await db.processed_data.create_index("campaign_id")
        await db.processed_data.create_index("date")
        await db.processed_data.create_index([
            ("campaign_id", 1),
            ("date", 1)
        ], unique=True)
        
        # Raw data indexes
        await db.raw_data.create_index("campaign_id")
        await db.raw_data.create_index("date")
        await db.raw_data.create_index([
            ("campaign_id", 1),
            ("date", 1)
        ], unique=True)
        
        # Meta Insights indexes
        await db.meta_insights.create_index("campaign_id")
        await db.meta_insights.create_index("date_start")
        await db.meta_insights.create_index("date_stop")
        
        # Google Ads Report indexes  
        await db.google_ads_reports.create_index("campaign_id")
        await db.google_ads_reports.create_index("segments_date")
        
        print("✅ MongoDB indexes created successfully")
        
    except Exception as e:
        print(f"⚠️  Some indexes may already exist or failed to create: {e}")

async def close_database():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        print("✅ MongoDB connection closed")

# Database dependency for FastAPI
async def get_db() -> AsyncGenerator:
    """FastAPI dependency for database operations"""
    if not client:
        await init_database()
    yield client

def get_database_name() -> str:
    """Get current database name"""
    return DATABASE_NAME