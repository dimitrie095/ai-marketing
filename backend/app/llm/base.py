"""
LLM Gateway Base Classes
L4-01: LLM Gateway Architektur
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Union, Any, AsyncGenerator
from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class LLMProvider(Enum):
    """Unterstützte LLM Provider"""
    OPENAI = "openai"
    KIMI = "kimi"  # Moonshot AI
    DEEPSEEK = "deepseek"
    # Zukünftige Provider:
    # ANTHROPIC = "anthropic"
    # GOOGLE = "google"


class MessageRole(Enum):
    """Rollen für Chat Messages"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class ChatMessage(BaseModel):
    """Eine einzelne Chat-Nachricht"""
    role: str
    content: str
    name: Optional[str] = None


class ChatCompletionRequest(BaseModel):
    """Request für Chat Completion"""
    messages: List[ChatMessage]
    model: Optional[str] = ""
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    stop: Optional[Union[str, List[str]]] = None
    stream: bool = False


class ChatCompletionResponse(BaseModel):
    """Response von Chat Completion"""
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Optional[Dict[str, int]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: int(v.timestamp())
        }


class LLMProviderConfig(BaseModel):
    """Konfiguration für einen LLM Provider"""
    provider: LLMProvider
    model: str
    api_key: str
    base_url: Optional[str] = None
    max_tokens: int = 4096
    temperature: float = 0.7
    top_p: float = 1.0
    is_active: bool = True
    is_default: bool = False
    cost_per_1k_input_tokens: Optional[float] = None
    cost_per_1k_output_tokens: Optional[float] = None
    
    class Config:
        use_enum_values = True


class LLMProviderBase(ABC):
    """
    Base-Klasse für alle LLM Provider
    Definiert die gemeinsame Schnittstelle
    """
    
    def __init__(self, config: LLMProviderConfig):
        self.config = config
        self.client = None
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialisiert den Provider-Client"""
        pass
    
    @abstractmethod
    async def chat_completion(
        self, 
        request: ChatCompletionRequest
    ) -> ChatCompletionResponse:
        """
        Synchrone Chat Completion
        
        Args:
            request: ChatCompletionRequest mit Nachrichten und Parametern
            
        Returns:
            ChatCompletionResponse mit Antwort
        """
        pass
    
    @abstractmethod
    async def chat_completion_stream(
        self, 
        request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        """
        Streaming Chat Completion
        
        Args:
            request: ChatCompletionRequest mit stream=True
            
        Yields:
            String-Chunks des Streams
        """
        pass
    
    @abstractmethod
    async def list_models(self) -> List[str]:
        """Listet verfügbare Models auf"""
        pass
    
    def get_provider_name(self) -> str:
        """Gibt den Namen des Providers zurück"""
        return self.config.provider.value
    
    def is_available(self) -> bool:
        """Prüft, ob der Provider verfügbar ist"""
        return self.config.is_active and bool(self.config.api_key)
    
    def calculate_cost(
        self, 
        input_tokens: int, 
        output_tokens: int
    ) -> Optional[float]:
        """
        Berechnet die Kosten für einen Request
        
        Args:
            input_tokens: Anzahl Input-Tokens
            output_tokens: Anzahl Output-Tokens
            
        Returns:
            Kosten in USD, oder None wenn keine Preise definiert
        """
        if not self.config.cost_per_1k_input_tokens or not self.config.cost_per_1k_output_tokens:
            return None
        
        input_cost = (input_tokens / 1000) * self.config.cost_per_1k_input_tokens
        output_cost = (output_tokens / 1000) * self.config.cost_per_1k_output_tokens
        
        return input_cost + output_cost


class LLMResponseError(Exception):
    """Fehler bei LLM-Provider Response"""
    
    def __init__(self, provider: str, message: str, status_code: int = None):
        self.provider = provider
        self.message = message
        self.status_code = status_code
        super().__init__(f"{provider}: {message}")


class LLMConfigurationError(Exception):
    """Fehler bei LLM-Konfiguration"""
    pass


# Standard-Models für jeden Provider
SUPPORTED_MODELS = {
    LLMProvider.OPENAI: [
        "gpt-4-turbo-preview",
        "gpt-4",
        "gpt-3.5-turbo",
        "gpt-3.5-turbo-16k",
    ],
    LLMProvider.KIMI: [
        "moonshot-v1-8k",
        "moonshot-v1-32k",
        "moonshot-v1-128k",
    ],
    LLMProvider.DEEPSEEK: [
        "deepseek-chat",
        "deepseek-coder",
    ],
}

# Standard-URLs für die APIs
DEFAULT_API_URLS = {
    LLMProvider.OPENAI: "https://api.openai.com/v1",
    LLMProvider.KIMI: "https://api.moonshot.cn/v1",
    LLMProvider.DEEPSEEK: "https://api.deepseek.com/v1",
}