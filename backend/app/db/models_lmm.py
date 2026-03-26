"""
LLM Models for Marketing Analytics AI
MongoDB Document models for LLM providers, configs, conversations and messages
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from beanie import Document, Link, Indexed
from pydantic import Field, BaseModel


class LLMProvider(Document):
    """LLM Provider configuration (e.g., OpenAI, Kimi, DeepSeek)"""
    id: int  # Auto-increment ID
    name: str  # openai, kimi, deepseek
    display_name: str  # Human-readable name
    base_url: str
    docs_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Settings
    class Settings:
        name = "llm_providers"
        indexes = [
            [("name", 1)],  # Unique index on name
        ]


class LLMConfig(Document):
    """LLM Configuration for a specific provider"""
    id: int  # Auto-increment ID
    name: str  # Config name (e.g., "Default OpenAI")
    provider_id: int  # Reference to LLMProvider
    model_name: str  # Specific model (e.g., gpt-3.5-turbo)
    api_key_encrypted: str  # Encrypted API key
    max_tokens: int = Field(default=4096)
    temperature: Decimal = Field(default=Decimal("0.7"))
    top_p: Decimal = Field(default=Decimal("1.0"))
    is_active: bool = Field(default=False)
    is_default: bool = Field(default=False)
    cost_per_1k_input_tokens: Decimal = Field(default=Decimal("0"))
    cost_per_1k_output_tokens: Decimal = Field(default=Decimal("0"))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    # Settings
    class Settings:
        name = "llm_configs"
        indexes = [
            [("provider_id", 1)],
            [("is_active", 1)],
            [("is_default", 1)],
            [("provider_id", 1), ("is_active", 1)]
        ]


class Conversation(Document):
    """Conversation session for chat interface"""
    id: str  # UUID
    user_id: str  # User who owns this conversation
    title: Optional[str] = None
    llm_config_id: Optional[int] = None  # Which LLM config is used
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    # Settings
    class Settings:
        name = "conversations"
        indexes = [
            [("user_id", 1)],
            [("created_at", -1)],
            [("updated_at", -1)],
            [("user_id", 1), ("created_at", -1)]
        ]


class Message(Document):
    """Individual message in a conversation"""
    id: str  # UUID
    conversation_id: str  # Reference to Conversation
    role: str  # system, user, assistant
    content: str
    tokens_used: Optional[int] = None
    cost: Optional[Decimal] = None
    llm_config_id: Optional[int] = None  # Which LLM config generated this
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Settings
    class Settings:
        name = "messages"
        indexes = [
            [("conversation_id", 1)],
            [("created_at", 1)],
            [("conversation_id", 1), ("created_at", 1)]
        ]


class SyncJob(Document):
    """Background sync job tracking"""
    id: int  # Auto-increment ID
    job_type: str  # meta_ads_sync, kpi_calculation, etc.
    status: str  # running, completed, failed
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    records_processed: int = Field(default=0)
    error_message: Optional[str] = None
    
    # Settings
    class Settings:
        name = "sync_jobs"
        indexes = [
            [("status", 1)],
            [("job_type", 1)],
            [("started_at", -1)]
        ]