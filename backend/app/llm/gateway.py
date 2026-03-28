"""
LLM Gateway
L4-01: Zentrales Gateway für LLM Provider Routing und Fallbacks
"""

from typing import List, Dict, Optional, Any, Union
from app.llm.base import (
    LLMProvider, 
    LLMProviderConfig, 
    ChatCompletionRequest, 
    ChatCompletionResponse,
    LLMResponseError,
    SUPPORTED_MODELS
)
from app.llm.providers import (
    OpenAIProvider, 
    KimiProvider, 
    DeepSeekProvider
)
import logging
from enum import Enum

# Provider-Factory - direkt hier definiert um Import-Probleme zu vermeiden
# Use string keys because LLMProviderConfig uses use_enum_values = True
PROVIDER_CLASSES = {
    "openai": OpenAIProvider,
    "kimi": KimiProvider,
    "deepseek": DeepSeekProvider,
}

logger = logging.getLogger(__name__)


class ProviderPriority(Enum):
    """Priorität für Provider-Auswahl"""
    PRIMARY = 1
    SECONDARY = 2
    FALLBACK = 3


class LLMGateway:
    """
    Zentrales LLM Gateway
    - Verwaltet mehrere Provider
    - Routing und Fallbacks
    - Last-Verteilung
    - Token-Usage Tracking
    """
    
    def __init__(self):
        self.providers: Dict[LLMProvider, Any] = {}
        self.priority_order: List[LLMProvider] = []
        self.token_usage = {}  # Provider -> {input_tokens, output_tokens, cost}
    
    async def initialize(
        self, 
        configs: List[LLMProviderConfig],
        priority_order: Optional[List[LLMProvider]] = None
    ) -> Dict[str, Any]:
        """
        Initialisiert das Gateway mit Provider-Konfigurationen
        
        Args:
            configs: List von LLMProviderConfig
            priority_order: Optionale Reihenfolge für Provider-Priorität
            
        Returns:
            Initialisierungs-Status
        """
        logger.info("🚀 Initialisiere LLM Gateway...")

        # Vorherige Provider-Instanzen zurücksetzen
        self.providers = {}
        self.priority_order = []
        self.token_usage = {}

        if not configs:
            logger.warning("⚠️  Keine Provider-Konfigurationen gefunden")
            return {"status": "warning", "message": "Keine Provider konfiguriert"}

        # Provider initialisieren
        initialized = 0
        errors = []
        
        for config in configs:
            try:
                provider_key = config.provider if isinstance(config.provider, str) else config.provider.value
                
                if not config.is_active:
                    logger.info(f"⏭️  Provider {provider_key} ist inaktiv")
                    continue
                
                provider_class = PROVIDER_CLASSES.get(provider_key)
                if not provider_class:
                    errors.append(f"Unbekannter Provider: {provider_key}")
                    continue
                
                provider = provider_class(config)
                await provider.initialize()
                
                self.providers[provider_key] = provider
                self.token_usage[provider_key] = {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cost": 0.0,
                    "requests": 0
                }
                initialized += 1
                logger.info(f"✅ {provider_key} initialisiert")
                
            except Exception as e:
                provider_key = config.provider if isinstance(config.provider, str) else config.provider.value
                error_msg = f"{provider_key}: {str(e)}"
                errors.append(error_msg)
                logger.error(f"❌ Provider Initialisierung fehlgeschlagen: {error_msg}")
        
        # Setze Prioritäts-Reihenfolge
        if priority_order:
            self.priority_order = priority_order
        else:
            # Standard-Reihenfolge: OpenAI -> Kimi -> DeepSeek
            self.priority_order = list(self.providers.keys())
        
        logger.info(f"✅ LLM Gateway initialisiert: {initialized} Provider aktiv")
        
        return {
            "status": "success" if initialized > 0 else "error",
            "initialized": initialized,
            "total_providers": len(configs),
            "errors": errors,
            "available_providers": list(self.providers.keys())
        }
    
    async def chat_completion(
        self,
        request: ChatCompletionRequest,
        preferred_provider: Optional[Union[LLMProvider, str]] = None,
        enable_fallback: bool = True
    ) -> ChatCompletionResponse:
        """
        Führt Chat Completion aus mit Provider-Routing und Fallbacks
        
        Args:
            request: ChatCompletionRequest
            preferred_provider: Bevorzugter Provider (optional)
            enable_fallback: Ob Fallbacks aktiviert sind
            
        Returns:
            ChatCompletionResponse
            
        Raises:
            LLMResponseError: Wenn alle Provider fehlschlagen
        """
        # Konvertiere preferred_provider zu String-Key
        preferred_key = None
        if preferred_provider:
            preferred_key = preferred_provider if isinstance(preferred_provider, str) else preferred_provider.value
        
        # Prüfe, ob ein bevorzugter Provider angegeben ist
        providers_to_try = []
        
        if preferred_key and preferred_key in self.providers:
            providers_to_try = [preferred_key]
            if enable_fallback:
                # Füge weitere Provider in Prioritätsreihenfolge hinzu
                providers_to_try.extend([
                    p for p in self.priority_order 
                    if p != preferred_key and p in self.providers
                ])
        else:
            # Nutze Prioritätsreihenfolge
            providers_to_try = [p for p in self.priority_order if p in self.providers]
        
        # Versuche jeden Provider
        errors = []
        
        for provider_key in providers_to_try:
            try:
                logger.info(f"🔄 Versuche Provider: {provider_key}")
                response = await self.providers[provider_key].chat_completion(request)
                
                # Tracke Token Usage
                if response.usage:
                    self._track_usage(provider_key, response.usage)
                
                logger.info(f"✅ Erfolg mit Provider: {provider_key}")
                return response
                
            except LLMResponseError as e:
                error_msg = f"{provider_key}: {e.message}"
                errors.append(error_msg)
                logger.warning(f"⚠️  Provider fehlgeschlagen: {error_msg}")
                
                if not enable_fallback:
                    break
        
        # Alle Provider fehlgeschlagen
        error_summary = " | ".join(errors)
        logger.error(f"❌ Alle Provider fehlgeschlagen: {error_summary}")
        raise LLMResponseError("ALL_PROVIDERS", f"Alle Provider fehlgeschlagen: {error_summary}")
    
    async def chat_completion_with_fallback(
        self,
        request: ChatCompletionRequest,
        max_retries: int = 3
    ) -> ChatCompletionResponse:
        """
        Führt Chat Completion aus mit automatischen Retries und Fallbacks
        
        Args:
            request: ChatCompletionRequest
            max_retries: Maximale Anzahl an Versuchen
            
        Returns:
            ChatCompletionResponse
        """
        for attempt in range(max_retries):
            try:
                return await self.chat_completion(request, enable_fallback=True)
            except LLMResponseError as e:
                if attempt == max_retries - 1:
                    # Letzter Versuch, wirf Fehler weiter
                    raise e
                
                logger.warning(f"📌 Retry {attempt + 1}/{max_retries} nach Fehler: {e}")
                # Kurze Pause vor Retry
                import asyncio
                await asyncio.sleep(0.5 * (attempt + 1))
        
        raise LLMResponseError("RETRY_EXHAUSTED", "Maximale Anzahl an Retries erreicht")
    
    def _track_usage(self, provider: Union[LLMProvider, str], usage: Dict[str, int]) -> None:
        """Tracke Token-Usage und Kosten"""
        provider_key = provider if isinstance(provider, str) else provider.value
        provider_stats = self.token_usage[provider_key]
        
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)
        
        provider_stats["input_tokens"] += input_tokens
        provider_stats["output_tokens"] += output_tokens
        provider_stats["requests"] += 1
        
        # Berechne Kosten wenn möglich
        provider_instance = self.providers[provider_key]
        cost = provider_instance.calculate_cost(input_tokens, output_tokens)
        
        if cost is not None:
            provider_stats["cost"] += cost
        
        logger.debug(f"📊 Token Usage {provider_key}: +{input_tokens} in, +{output_tokens} out")
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Gibt Token-Usage Statistiken zurück"""
        total_input = sum(stats["input_tokens"] for stats in self.token_usage.values())
        total_output = sum(stats["output_tokens"] for stats in self.token_usage.values())
        total_cost = sum(stats["cost"] for stats in self.token_usage.values())
        total_requests = sum(stats["requests"] for stats in self.token_usage.values())
        
        return {
            "total": {
                "input_tokens": total_input,
                "output_tokens": total_output,
                "cost": total_cost,
                "requests": total_requests
            },
            "by_provider": {
                provider: stats
                for provider, stats in self.token_usage.items()
            }
        }
    
    def list_available_providers(self) -> List[Dict[str, Any]]:
        """Listet verfügbare Provider mit Status"""
        providers_info = []
        
        for provider, provider_instance in self.providers.items():
            info = {
                "provider": provider,
                "model": provider_instance.config.model,
                "is_active": provider_instance.config.is_active,
                "is_default": provider_instance.config.is_default,
                "is_available": provider_instance.is_available(),
                "supported_models": SUPPORTED_MODELS.get(provider, [])
            }
            providers_info.append(info)
        
        return providers_info
    
    def set_priority_order(self, priority_order: List[LLMProvider]) -> None:
        """Ändert die Provider-Prioritätsreihenfolge"""
        # Validierung
        for provider in priority_order:
            if provider not in self.providers:
                raise ValueError(f"Provider {provider} ist nicht initialisiert")

        self.priority_order = priority_order
        logger.info(f"📋 Provider-Priorität geändert: {priority_order}")


# Globaler Gateway-Instance
llm_gateway = LLMGateway()