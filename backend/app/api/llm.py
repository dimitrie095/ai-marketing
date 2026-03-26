"""
LLM API Endpoints
L4-01 bis L4-04: LLM Gateway & Provider Integration API
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.db.session import get_db
from app.llm import (
    llm_gateway,
    config_manager,
    LLMProvider,
    ChatCompletionRequest,
    ChatMessage,
    LLMResponseError
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm", tags=["LLM"])


# ============================================
# Request/Response Models
# ============================================

class ChatMessageRequest(BaseModel):
    """Request Model für Chat Messages"""
    role: str
    content: str


class ChatCompletionAPIRequest(BaseModel):
    """API Request für Chat Completion"""
    messages: List[ChatMessageRequest]
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    provider: Optional[str] = None  # 'openai', 'kimi', 'deepseek'
    stream: bool = False


class ChatCompletionAPIResponse(BaseModel):
    """API Response für Chat Completion"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    provider_used: Optional[str] = None
    tokens_used: Optional[Dict[str, int]] = None


class LLMProviderInfo(BaseModel):
    """Info über verfügbaren Provider"""
    provider: str
    model: str
    is_active: bool
    is_default: bool
    is_available: bool
    supported_models: List[str]


class LLMUsageStats(BaseModel):
    """Token-Usage Statistiken"""
    total: Dict[str, Any]
    by_provider: Dict[str, Any]


# ============================================
# API Endpoints
# ============================================

@router.post("/chat/completion", response_model=ChatCompletionAPIResponse)
async def chat_completion(
    request: ChatCompletionAPIRequest,
    db=Depends(get_db)
):
    """
    Führt Chat Completion mit LLM Gateway aus
    
    Args:
        request: ChatCompletionAPIRequest mit messages und Parametern
        
    Returns:
        ChatCompletionAPIResponse mit Antwort oder Fehler
    """
    try:
        # Konvertiere Messages
        messages = [
            ChatMessage(role=msg.role, content=msg.content)
            for msg in request.messages
        ]
        
        # Erstelle Request
        llm_request = ChatCompletionRequest(
            messages=messages,
            model=request.model or llm_gateway.list_available_providers()[0]["model"],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=request.stream
        )
        
        # Bestimme Provider
        provider = None
        if request.provider:
            try:
                provider = LLMProvider(request.provider.lower())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ungültiger Provider: {request.provider}"
                )
        
        # Führe Chat Completion aus
        response = await llm_gateway.chat_completion(
            request=llm_request,
            preferred_provider=provider,
            enable_fallback=True
        )
        
        return ChatCompletionAPIResponse(
            success=True,
            data={
                "id": response.id,
                "model": response.model,
                "created": response.created,
                "choices": response.choices
            },
            provider_used=llm_gateway.get_usage_stats()["by_provider"],
            tokens_used=response.usage
        )
        
    except LLMResponseError as e:
        logger.error(f"LLM Gateway Error: {e}")
        return ChatCompletionAPIResponse(
            success=False,
            error=f"{e.provider}: {e.message}"
        )
    except Exception as e:
        logger.error(f"Unexpected Error: {e}")
        return ChatCompletionAPIResponse(
            success=False,
            error=f"Internal error: {str(e)}"
        )


@router.post("/chat/stream")
async def chat_completion_stream(
    request: ChatCompletionAPIRequest,
    db=Depends(get_db)
):
    """
    Streaming Chat Completion
    
    Args:
        request: ChatCompletionAPIRequest mit stream=True
        
    Returns:
        Streaming Response mit chunks
    """
    try:
        from fastapi.responses import StreamingResponse
        
        # Konvertiere Messages
        messages = [
            ChatMessage(role=msg.role, content=msg.content)
            for msg in request.messages
        ]
        
        # Erstelle Request mit stream=True
        llm_request = ChatCompletionRequest(
            messages=messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=True
        )
        
        # Bestimme Provider
        provider = None
        if request.provider:
            try:
                provider = LLMProvider(request.provider.lower())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ungültiger Provider: {request.provider}"
                )
        
        # Finde den richtigen Provider
        from app.llm import llm_gateway
        provider_instance = llm_gateway.providers.get(provider or llm_gateway.priority_order[0])
        
        if not provider_instance:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Kein Provider verfügbar"
            )
        
        # Stream-Generator
        async def generate():
            try:
                async for chunk in provider_instance.chat_completion_stream(llm_request):
                    yield f"data: {chunk}\n\n"
            except Exception as e:
                yield f"error: {str(e)}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache"}
        )
        
    except Exception as e:
        logger.error(f"Streaming Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Streaming fehlgeschlagen: {str(e)}"
        )


@router.get("/providers", response_model=List[LLMProviderInfo])
async def list_providers(db=Depends(get_db)):
    """
    Listet alle verfügbaren LLM Provider
    
    Returns:
        List von LLMProviderInfo
    """
    try:
        providers = llm_gateway.list_available_providers()
        return [LLMProviderInfo(**provider) for provider in providers]
    except Exception as e:
        logger.error(f"Provider List Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Laden der Provider: {str(e)}"
        )


@router.get("/usage", response_model=LLMUsageStats)
async def get_usage_stats(db=Depends(get_db)):
    """
    Gibt Token-Usage Statistiken zurück
    
    Returns:
        LLMUsageStats mit Gesamt- und Provider-Statistiken
    """
    try:
        stats = llm_gateway.get_usage_stats()
        return LLMUsageStats(**stats)
    except Exception as e:
        logger.error(f"Usage Stats Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Laden der Statistiken: {str(e)}"
        )


@router.post("/initialize")
async def initialize_llm_gateway(db=Depends(get_db)):
    """
    Initialisiert das LLM Gateway mit Umgebungs-Konfigurationen
    
    Returns:
        Initialisierungs-Status
    """
    try:
        # Lade Konfigurationen
        configs = config_manager.load_configs_from_env()
        
        if not configs:
            return {
                "status": "warning",
                "message": "Keine LLM Provider in Umgebung konfiguriert",
                "configured_providers": ["openai", "kimi", "deepseek"]
            }
        
        # Initialisiere Gateway
        result = await llm_gateway.initialize(configs)
        
        return result
        
    except Exception as e:
        logger.error(f"Gateway Initialization Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Initialisierung fehlgeschlagen: {str(e)}"
        )


@router.get("/test")
async def test_llm_providers(db=Depends(get_db)):
    """
    Test-Funktion für LLM Providers
    Sendet einen einfachen Test-Prompt an alle verfügbaren Provider
    """
    try:
        providers = llm_gateway.list_available_providers()
        
        test_results = []
        
        for provider_info in providers:
            provider = LLMProvider(provider_info["provider"])
            
            try:
                # Test-Request
                request = ChatCompletionRequest(
                    messages=[
                        ChatMessage(role="user", content="Was ist 2+2?")
                    ],
                    model=provider_info["model"],
                    temperature=0.0
                )
                
                response = await llm_gateway.chat_completion(
                    request=request,
                    preferred_provider=provider
                )
                
                result_text = response.choices[0]["message"]["content"] if response.choices else "No response"
                
                test_results.append({
                    "provider": provider.value,
                    "status": "success",
                    "response": result_text[:100]  # Nur erste 100 Zeichen
                })
                
            except Exception as e:
                test_results.append({
                    "provider": provider.value,
                    "status": "error",
                    "error": str(e)
                })
        
        return {
            "status": "completed",
            "results": test_results,
            "total": len(test_results),
            "successful": len([r for r in test_results if r["status"] == "success"])
        }
        
    except Exception as e:
        logger.error(f"Test Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test fehlgeschlagen: {str(e)}"
        )


# ============================================
# Health Check
# ============================================

@router.get("/health")
async def llm_health_check(db=Depends(get_db)):
    """
    Health Check für LLM Gateway
    
    Returns:
        Status und verfügbare Provider
    """
    try:
        providers = llm_gateway.list_available_providers()
        
        return {
            "status": "healthy" if len(providers) > 0 else "degraded",
            "providers_count": len(providers),
            "available_models": sum(len(p["supported_models"]) for p in providers),
            "gateway_initialized": len(llm_gateway.providers) > 0
        }
    except Exception as e:
        logger.error(f"Health Check Error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }