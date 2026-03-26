"""
LLM Provider Implementations
L4-02: OpenAI Integration
L4-03: Kimi (Moonshot) Integration
L4-04: DeepSeek Integration
"""

import openai
from typing import List, Dict, Any, AsyncGenerator
import httpx
from app.llm.base import (
    LLMProvider, 
    LLMProviderConfig, 
    LLMProviderBase,
    ChatCompletionRequest, 
    ChatCompletionResponse,
    ChatMessage,
    LLMResponseError
)
import logging

logger = logging.getLogger(__name__)


class OpenAIProvider(LLMProviderBase):
    """
    OpenAI Provider Implementation
    Unterstützt: GPT-4, GPT-3.5 Turbo, etc.
    """
    
    def __init__(self, config: LLMProviderConfig):
        super().__init__(config)
        self.client = None
    
    async def initialize(self) -> None:
        """Initialisiert den OpenAI Client"""
        try:
            self.client = openai.AsyncOpenAI(
                api_key=self.config.api_key,
                base_url=self.config.base_url or "https://api.openai.com/v1"
            )
            logger.info(f"✅ OpenAI Provider initialisiert: {self.config.model}")
        except Exception as e:
            logger.error(f"❌ OpenAI Initialisierung fehlgeschlagen: {e}")
            raise LLMResponseError("OpenAI", f"Initialisierung fehlgeschlagen: {str(e)}")
    
    async def chat_completion(
        self, 
        request: ChatCompletionRequest
    ) -> ChatCompletionResponse:
        """OpenAI Chat Completion"""
        try:
            if not self.client:
                await self.initialize()
            
            # Konvertiere Messages zu OpenAI Format
            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ]
            
            response = await self.client.chat.completions.create(
                model=request.model or self.config.model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
                frequency_penalty=request.frequency_penalty,
                presence_penalty=request.presence_penalty,
                stop=request.stop,
                stream=False
            )
            
            # Konvertiere zu unserem Standard-Format
            return ChatCompletionResponse(
                id=response.id,
                created=int(response.created),
                model=response.model,
                choices=[
                    {
                        "index": i,
                        "message": {
                            "role": choice.message.role,
                            "content": choice.message.content
                        },
                        "finish_reason": choice.finish_reason
                    }
                    for i, choice in enumerate(response.choices)
                ],
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                } if response.usage else None
            )
        except openai.APIError as e:
            logger.error(f"OpenAI API Error: {e}")
            raise LLMResponseError("OpenAI", str(e), getattr(e, 'status_code', None))
        except Exception as e:
            logger.error(f"OpenAI Unexpected Error: {e}")
            raise LLMResponseError("OpenAI", f"Unexpected error: {str(e)}")
    
    async def chat_completion_stream(
        self, 
        request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        """OpenAI Streaming Chat Completion"""
        try:
            if not self.client:
                await self.initialize()
            
            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ]
            
            stream = await self.client.chat.completions.create(
                model=request.model or self.config.model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
                frequency_penalty=request.frequency_penalty,
                presence_penalty=request.presence_penalty,
                stop=request.stop,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except openai.APIError as e:
            logger.error(f"OpenAI Streaming Error: {e}")
            raise LLMResponseError("OpenAI", str(e), getattr(e, 'status_code', None))
        except Exception as e:
            logger.error(f"OpenAI Streaming Unexpected Error: {e}")
            raise LLMResponseError("OpenAI", f"Unexpected error: {str(e)}")
    
    async def list_models(self) -> List[str]:
        """Listet verfügbare OpenAI Models auf"""
        try:
            if not self.client:
                await self.initialize()
            
            models = await self.client.models.list()
            return [model.id for model in models.data]
        except Exception as e:
            logger.error(f"OpenAI List Models Error: {e}")
            # Fallback zu Standard-Models
            return [
                "gpt-4-turbo-preview",
                "gpt-4",
                "gpt-3.5-turbo",
                "gpt-3.5-turbo-16k",
            ]


class KimiProvider(LLMProviderBase):
    """
    Kimi (Moonshot AI) Provider Implementation
    API-kompatibel mit OpenAI
    """
    
    def __init__(self, config: LLMProviderConfig):
        super().__init__(config)
        self.client = None
    
    async def initialize(self) -> None:
        """Initialisiert den Kimi Client"""
        try:
            self.client = openai.AsyncOpenAI(
                api_key=self.config.api_key,
                base_url=self.config.base_url or "https://api.moonshot.cn/v1"
            )
            logger.info(f"✅ Kimi Provider initialisiert: {self.config.model}")
        except Exception as e:
            logger.error(f"❌ Kimi Initialisierung fehlgeschlagen: {e}")
            raise LLMResponseError("Kimi", f"Initialisierung fehlgeschlagen: {str(e)}")
    
    async def chat_completion(
        self, 
        request: ChatCompletionRequest
    ) -> ChatCompletionResponse:
        """Kimi Chat Completion"""
        try:
            if not self.client:
                await self.initialize()
            
            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ]
            
            response = await self.client.chat.completions.create(
                model=request.model or self.config.model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
                stream=False
            )
            
            return ChatCompletionResponse(
                id=response.id,
                created=int(response.created),
                model=response.model,
                choices=[
                    {
                        "index": i,
                        "message": {
                            "role": choice.message.role,
                            "content": choice.message.content
                        },
                        "finish_reason": choice.finish_reason
                    }
                    for i, choice in enumerate(response.choices)
                ],
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                } if response.usage else None
            )
        except Exception as e:
            logger.error(f"Kimi API Error: {e}")
            raise LLMResponseError("Kimi", str(e))
    
    async def chat_completion_stream(
        self, 
        request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        """Kimi Streaming Chat Completion"""
        try:
            if not self.client:
                await self.initialize()
            
            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ]
            
            stream = await self.client.chat.completions.create(
                model=request.model or self.config.model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"Kimi Streaming Error: {e}")
            raise LLMResponseError("Kimi", str(e))
    
    async def list_models(self) -> List[str]:
        """Listet verfügbare Kimi Models auf"""
        try:
            if not self.client:
                await self.initialize()
            
            models = await self.client.models.list()
            return [model.id for model in models.data]
        except Exception as e:
            logger.error(f"Kimi List Models Error: {e}")
            # Fallback zu Standard-Models
            return [
                "moonshot-v1-8k",
                "moonshot-v1-32k",
                "moonshot-v1-128k",
            ]


class DeepSeekProvider(LLMProviderBase):
    """
    DeepSeek Provider Implementation
    API-kompatibel mit OpenAI
    """
    
    def __init__(self, config: LLMProviderConfig):
        super().__init__(config)
        self.client = None
    
    async def initialize(self) -> None:
        """Initialisiert den DeepSeek Client"""
        try:
            self.client = openai.AsyncOpenAI(
                api_key=self.config.api_key,
                base_url=self.config.base_url or "https://api.deepseek.com/v1"
            )
            logger.info(f"✅ DeepSeek Provider initialisiert: {self.config.model}")
        except Exception as e:
            logger.error(f"❌ DeepSeek Initialisierung fehlgeschlagen: {e}")
            raise LLMResponseError("DeepSeek", f"Initialisierung fehlgeschlagen: {str(e)}")
    
    async def chat_completion(
        self, 
        request: ChatCompletionRequest
    ) -> ChatCompletionResponse:
        """DeepSeek Chat Completion"""
        try:
            if not self.client:
                await self.initialize()
            
            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ]
            
            response = await self.client.chat.completions.create(
                model=request.model or self.config.model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
                stream=False
            )
            
            return ChatCompletionResponse(
                id=response.id,
                created=int(response.created),
                model=response.model,
                choices=[
                    {
                        "index": i,
                        "message": {
                            "role": choice.message.role,
                            "content": choice.message.content
                        },
                        "finish_reason": choice.finish_reason
                    }
                    for i, choice in enumerate(response.choices)
                ],
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                } if response.usage else None
            )
        except Exception as e:
            logger.error(f"DeepSeek API Error: {e}")
            raise LLMResponseError("DeepSeek", str(e))
    
    async def chat_completion_stream(
        self, 
        request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        """DeepSeek Streaming Chat Completion"""
        try:
            if not self.client:
                await self.initialize()
            
            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ]
            
            stream = await self.client.chat.completions.create(
                model=request.model or self.config.model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"DeepSeek Streaming Error: {e}")
            raise LLMResponseError("DeepSeek", str(e))
    
    async def list_models(self) -> List[str]:
        """Listet verfügbare DeepSeek Models auf"""
        try:
            if not self.client:
                await self.initialize()
            
            models = await self.client.models.list()
            return [model.id for model in models.data]
        except Exception as e:
            logger.error(f"DeepSeek List Models Error: {e}")
            # Fallback zu Standard-Models
            return [
                "deepseek-chat",
                "deepseek-coder",
            ]


# Provider-Factory
PROVIDER_CLASSES = {
    LLMProvider.OPENAI: OpenAIProvider,
    LLMProvider.KIMI: KimiProvider,
    LLMProvider.DEEPSEEK: DeepSeekProvider,
}