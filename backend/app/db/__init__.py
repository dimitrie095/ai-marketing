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
        create_indexes,
        is_db_available
    )
    from .base import (
        Campaign,
        AdSet,
        Ad,
        Metric,
        ProcessedData,
        RawData,
        MetaInsights,
        GoogleAdsReport,
        Experiment,
        ExperimentVariant,
        ExperimentResult
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
    from .models_ads_config import (
        AdPlatformConfig
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
    AdPlatformConfig = DummyDocument
    
    # Create dummy functions
    async def init_database(): pass
    async def close_database(): pass
    def get_db(): return None
    def get_database_name(): return "none"
    async def create_indexes(): pass
    def is_db_available(): return False

__all__ = [
    # Session functions
    "init_database",
    "close_database", 
    "get_db",
    "get_database_name",
    "create_indexes",
    "is_db_available",
    
    # Document models
    "Campaign",
    "AdSet",
    "Ad",
    "Metric",
    "ProcessedData",
    "RawData",
    "MetaInsights",
    "GoogleAdsReport",
    "Experiment",
    "ExperimentVariant",
    "ExperimentResult",
    
    # LLM models
    "LLMProvider",
    "LLMConfig",
    "Conversation",
    "Message",
    "SyncJob",
    "PromptTemplate",
    "PromptType",

    # Ads platform config
    "AdPlatformConfig",
    
    # Import status
    "DB_IMPORT_SUCCESS"
]