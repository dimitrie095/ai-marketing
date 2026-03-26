"""
LLM Gateway Module
Multi-Provider LLM Support
"""

from .base import (
    LLMProvider,
    MessageRole,
    ChatMessage,
    ChatCompletionRequest,
    ChatCompletionResponse,
    LLMProviderConfig,
    LLMProviderBase,
    LLMResponseError,
    LLMConfigurationError,
    SUPPORTED_MODELS,
    DEFAULT_API_URLS,
)

from .providers import (
    OpenAIProvider,
    KimiProvider,
    DeepSeekProvider,
)

from .gateway import (
    LLMGateway,
    ProviderPriority,
    llm_gateway,
    PROVIDER_CLASSES,
)

from .config import (
    LLMConfigManager,
    config_manager,
)

__all__ = [
    # Base
    "LLMProvider",
    "MessageRole",
    "ChatMessage",
    "ChatCompletionRequest",
    "ChatCompletionResponse",
    "LLMProviderConfig",
    "LLMProviderBase",
    "LLMResponseError",
    "LLMConfigurationError",
    "SUPPORTED_MODELS",
    "DEFAULT_API_URLS",
    
    # Providers
    "OpenAIProvider",
    "KimiProvider",
    "DeepSeekProvider",
    "PROVIDER_CLASSES",
    
    # Gateway
    "LLMGateway",
    "ProviderPriority",
    "llm_gateway",
    
    # Config
    "LLMConfigManager",
    "config_manager",
]