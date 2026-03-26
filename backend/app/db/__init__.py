# Database Module - MongoDB with Beanie ODM
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

# LLM Models
from .models_lmm import (
    LLMProvider,
    LLMConfig,
    Conversation,
    Message,
    SyncJob
)

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
    "SyncJob"
]