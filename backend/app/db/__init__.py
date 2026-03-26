# Database Module - MongoDB with Beanie ODM
import logging

logger = logging.getLogger(__name__)

# Try to import database components, provide fallbacks if import fails
try:
    from .session import (
        init_database, 
        close_database, 
        get_db, 
        get_database_name, 
        create_indexes
    )
    from .base import (
        Campaign,
        AdSet,
        Ad,
        Metric,
        ProcessedData,
        RawData,
        MetaInsights,
        GoogleAdsReport
    )
    from .models_llm import (
        LLMProvider,
        LLMConfig,
        Conversation,
        Message,
        SyncJob,
        PromptTemplate,
        PromptType
    )
    DB_IMPORT_SUCCESS = True
    logger.info("✅ Database components imported successfully")
except Exception as e:
    DB_IMPORT_SUCCESS = False
    logger.error(f"❌ Failed to import database components: {e}")
    
    # Create dummy classes to prevent import errors
    class DummyDocument:
        pass
    
    Campaign = AdSet = Ad = Metric = ProcessedData = RawData = MetaInsights = GoogleAdsReport = DummyDocument
    LLMProvider = LLMConfig = Conversation = Message = SyncJob = PromptTemplate = PromptType = DummyDocument
    
    # Create dummy functions
    async def init_database(): pass
    async def close_database(): pass
    def get_db(): return None
    def get_database_name(): return "none"
    async def create_indexes(): pass

__all__ = [
    # Session functions
    "init_database",
    "close_database", 
    "get_db",
    "get_database_name",
    "create_indexes",
    
    # Document models
    "Campaign",
    "AdSet",
    "Ad",
    "Metric",
    "ProcessedData",
    "RawData",
    "MetaInsights",
    "GoogleAdsReport",
    
    # LLM models
    "LLMProvider",
    "LLMConfig",
    "Conversation",
    "Message",
    "SyncJob",
    "PromptTemplate",
    "PromptType",
    
    # Import status
    "DB_IMPORT_SUCCESS"
]