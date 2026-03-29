"""
Real-time Chat API with Server-Sent Events
B-06: Chat SSE Endpoint
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
import asyncio
import json
import uuid
from pydantic import BaseModel, Field
from fastapi.responses import StreamingResponse
from app.db.session import get_db
from app.db.models_llm import Conversation, Message
from app.db.models import User
from app.core.auth import get_current_active_user, verify_token
from app.llm import llm_gateway, LLMProvider, ChatCompletionRequest, ChatMessage
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


_context_cache: dict = {"value": None, "expires_at": 0.0}
_CONTEXT_TTL = 300  # seconds


async def build_marketing_context() -> str:
    """
    Fetches real campaign KPI data from the database and builds a system context
    string so the AI can answer questions based on actual numbers.
    Results are cached for 5 minutes to avoid DB overload on every chat message.
    """
    import time
    now = time.monotonic()
    if _context_cache["value"] and now < _context_cache["expires_at"]:
        return _context_cache["value"]

    try:
        from app.db.models import Campaign, AudienceDemographic
        from app.services.kpi_service import KPIService
        from app.services.data_seeder import seed_demographics_for_campaign

        today = date.today()
        start_7d = today - timedelta(days=7)
        start_30d = today - timedelta(days=30)

        campaigns = await Campaign.find_all().to_list()
        if not campaigns:
            return (
                "Du bist ein KI-Marketing-Analyst. "
                "Aktuell sind keine Kampagnendaten in der Datenbank vorhanden."
            )

        total_spend_7d = total_revenue_7d = 0.0
        total_spend_30d = total_revenue_30d = 0.0
        campaign_lines = []

        def fmt(d: dict) -> str:
            return (
                f"Ausgaben={d.get('spend', 'N/A')} €, "
                f"Umsatz={d.get('revenue', 'N/A')} €, "
                f"ROAS={d.get('roas', 'N/A')}, "
                f"CTR={d.get('ctr', 'N/A')}%, "
                f"CPC={d.get('cpc', 'N/A')} €, "
                f"Conversions={d.get('conversions', 'N/A')}, "
                f"Impressions={d.get('impressions', 'N/A')}, "
                f"Klicks={d.get('clicks', 'N/A')}"
            )

        for c in campaigns:
            kpi7 = await KPIService.get_kpi_for_entity("campaign", c.id, start_7d, today)
            kpi30 = await KPIService.get_kpi_for_entity("campaign", c.id, start_30d, today)
            d7 = kpi7.get("data", {}) if kpi7.get("status") == "success" else {}
            d30 = kpi30.get("data", {}) if kpi30.get("status") == "success" else {}

            total_spend_7d += float(d7.get("spend") or 0)
            total_revenue_7d += float(d7.get("revenue") or 0)
            total_spend_30d += float(d30.get("spend") or 0)
            total_revenue_30d += float(d30.get("revenue") or 0)

            # Demographic data – seed on-the-fly if missing
            demo = await AudienceDemographic.find_one(
                AudienceDemographic.campaign_id == c.id
            )
            if not demo:
                await seed_demographics_for_campaign(c.id)
                demo = await AudienceDemographic.find_one(
                    AudienceDemographic.campaign_id == c.id
                )

            demo_lines = ""
            if demo:
                locs = ", ".join(
                    f"{p.split(':')[0]} ({p.split(':')[1]}%)" if ":" in p else p
                    for p in demo.top_locations.split(",") if p
                )
                ints = ", ".join(
                    f"{p.split(':')[0]} ({p.split(':')[1]}%)" if ":" in p else p
                    for p in demo.top_interests.split(",") if p
                )
                demo_lines = (
                    f"\n  Demografie:"
                    f"\n    Alter:    18-24={demo.age_18_24}%  25-34={demo.age_25_34}%  35-44={demo.age_35_44}%  45-54={demo.age_45_54}%  55+={demo.age_55_plus}%"
                    f"\n    Geschlecht: Männlich={demo.gender_male}%  Weiblich={demo.gender_female}%  Unbekannt={demo.gender_unknown}%"
                    f"\n    Gerät:    Mobile={demo.device_mobile}%  Desktop={demo.device_desktop}%  Tablet={demo.device_tablet}%"
                    f"\n    Top Städte: {locs}"
                    f"\n    Top Interessen: {ints}"
                )

            campaign_lines.append(
                f"Kampagne \"{c.name}\" (Status: {c.status}):\n"
                f"  7 Tage  ({start_7d} – {today}): {fmt(d7) if d7 else 'keine Daten'}\n"
                f"  30 Tage ({start_30d} – {today}): {fmt(d30) if d30 else 'keine Daten'}"
                + demo_lines
            )

        roas_7d = round(total_revenue_7d / total_spend_7d, 2) if total_spend_7d else 0
        roas_30d = round(total_revenue_30d / total_spend_30d, 2) if total_spend_30d else 0

        lines = [
            "Du bist ein KI-Marketing-Analyst mit direktem Zugriff auf folgende ECHTE Datenbankwerte.",
            "Beantworte Fragen immer mit diesen konkreten Zahlen – bitte den Nutzer NIEMALS, Daten manuell einzugeben.",
            f"Aktuelles Datum: {today.isoformat()}",
            "",
            "=== GESAMTÜBERSICHT (alle Kampagnen) ===",
            f"Letzte 7 Tage:  Ausgaben={total_spend_7d:.2f} €  Umsatz={total_revenue_7d:.2f} €  ROAS={roas_7d}x",
            f"Letzte 30 Tage: Ausgaben={total_spend_30d:.2f} €  Umsatz={total_revenue_30d:.2f} €  ROAS={roas_30d}x",
            "",
            "=== KAMPAGNEN-DETAILS (inkl. Audience-Demografie) ===",
        ] + campaign_lines

        result = "\n".join(lines)
        import time
        _context_cache["value"] = result
        _context_cache["expires_at"] = time.monotonic() + _CONTEXT_TTL
        return result

    except Exception as e:
        logger.warning(f"build_marketing_context error: {e}")
        return (
            "Du bist ein KI-Marketing-Analyst. "
            "Die Datenbankverbindung ist momentan nicht verfügbar."
        )


async def load_conversation_messages(conversation_id: str, limit: int = 20) -> List[ChatMessage]:
    """Returns recent messages of a conversation as ChatMessage list."""
    try:
        msgs = await Message.find({"conversation_id": conversation_id}).sort("created_at").to_list()
        msgs = msgs[-limit:]
        return [ChatMessage(role=m.role, content=m.content) for m in msgs]
    except Exception as e:
        logger.warning(f"load_conversation_messages error: {e}")
        return []


# ============================================
# Models
# ============================================

class ChatMessageRequest(BaseModel):
    """Request for sending a chat message"""
    message: str = Field(..., description="The user's message")
    conversation_id: Optional[str] = Field(None, description="Optional conversation ID")
    model: Optional[str] = Field(None, description="Specific model to use")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Temperature for generation")
    max_tokens: Optional[int] = Field(1000, description="Max tokens in response")


class ChatMessageResponse(BaseModel):
    """Response for a chat message"""
    id: str
    conversation_id: str
    role: str
    content: str
    timestamp: datetime
    tokens_used: Optional[int] = None
    cost: Optional[float] = None


class ConversationResponse(BaseModel):
    """Response with conversation data"""
    id: str
    user_id: str
    title: str
    messages: List[ChatMessageResponse]
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_tokens: int = 0
    total_cost: float = 0.0


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation"""
    title: Optional[str] = Field(None, description="Optional title for the conversation")


class StreamingMessage(BaseModel):
    """Streaming message chunk"""
    type: str  # "chunk", "complete", "error"
    content: Optional[str] = None
    message_id: Optional[str] = None
    conversation_id: Optional[str] = None


# ============================================
# Chat Endpoints
# ============================================

@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(
    request: ChatMessageRequest,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """
    Send a chat message and get a response.
    """
    try:
        # Get or create conversation
        conversation_id = request.conversation_id

        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            conversation = Conversation(
                id=conversation_id,
                user_id=current_user.username,
                title=f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            await conversation.save()
        else:
            conversation = await Conversation.find_one(Conversation.id == conversation_id, Conversation.user_id == current_user.username)
            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Conversation {conversation_id} not found"
                )
        
        # Save user message
        user_message_id = str(uuid.uuid4())
        user_message = Message(
            id=user_message_id,
            conversation_id=conversation_id,
            role="user",
            content=request.message,
            created_at=datetime.utcnow()
        )
        await user_message.save()

        # Build system context with real DB data + conversation history
        system_context = await build_marketing_context()
        history = await load_conversation_messages(conversation_id)

        chat_request = ChatCompletionRequest(
            messages=[ChatMessage(role="system", content=system_context)] + history,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        # Get streaming response first to check which provider responds
        provider = None
        if request.model and "openai" in request.model:
            provider = LLMProvider.OPENAI
        elif request.model and "kimi" in request.model:
            provider = LLMProvider.KIMI
        elif request.model and "deepseek" in request.model:
            provider = LLMProvider.DEEPSEEK
        
        response = await llm_gateway.chat_completion(
            request=chat_request,
            preferred_provider=provider
        )
        
        # Extract response content
        ai_content = response.choices[0]["message"]["content"] if response.choices else "No response"
        
        # Save AI message
        ai_message_id = str(uuid.uuid4())
        tokens_used = response.usage.get("completion_tokens", 0) if response.usage else None
        
        ai_message = Message(
            id=ai_message_id,
            conversation_id=conversation_id,
            role="assistant",
            content=ai_content,
            tokens_used=tokens_used,
            cost=0.0,  # TODO: Calculate actual cost
            created_at=datetime.utcnow()
        )
        await ai_message.save()
        
        # Update conversation updated_at
        conversation.updated_at = datetime.utcnow()
        await conversation.save()
        
        return ChatMessageResponse(
            id=ai_message_id,
            conversation_id=conversation_id,
            role="assistant",
            content=ai_content,
            timestamp=ai_message.created_at,
            tokens_used=tokens_used
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )


@router.get("/sse")
async def chat_sse_endpoint(request: Request):
    """
    Server-Sent Events endpoint for real-time chat streaming
    
    The client connects to this endpoint and receives streaming responses.
    
    Returns:
        Server-Sent Events stream
    """
    try:
        # This is a demonstration endpoint
        # In production, you'd manage active connections here
        
        async def event_generator():
            try:
                for i in range(10):
                    if await request.is_disconnected():
                        break
                    
                    # Send a message every second
                    message = StreamingMessage(
                        type="chunk",
                        content=f"Data chunk {i}\n"
                    )
                    
                    yield f"data: {json.dumps(message.dict())}\n\n"
                    await asyncio.sleep(1)
                
                # Send completion message
                completion = StreamingMessage(
                    type="complete",
                    content="Stream completed"
                )
                yield f"data: {json.dumps(completion.dict())}\n\n"
                
            except asyncio.CancelledError:
                logger.info("SSE connection cancelled")
            except Exception as e:
                error = StreamingMessage(
                    type="error",
                    content=f"Error: {str(e)}"
                )
                yield f"data: {json.dumps(error.dict())}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*"
            }
        )
        
    except Exception as e:
        logger.error(f"SSE endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SSE setup failed: {str(e)}"
        )


@router.post("/sse/stream")
async def chat_sse_stream(
    request: ChatMessageRequest,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """
    Send a chat message and receive streaming response via Server-Sent Events.
    """
    try:
        from fastapi.responses import StreamingResponse

        # Get or create conversation
        conversation_id = request.conversation_id

        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            conversation = Conversation(
                id=conversation_id,
                user_id=current_user.username,
                title=f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            await conversation.save()
        else:
            conversation = await Conversation.find_one(Conversation.id == conversation_id, Conversation.user_id == current_user.username)
            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Conversation {conversation_id} not found"
                )
        
        # Save user message
        user_message_id = str(uuid.uuid4())
        user_message = Message(
            id=user_message_id,
            conversation_id=conversation_id,
            role="user",
            content=request.message,
            created_at=datetime.utcnow()
        )
        await user_message.save()
        
        # Build system context with real DB data + conversation history
        system_context = await build_marketing_context()
        history = await load_conversation_messages(conversation_id)

        # Prepare chat request with streaming
        chat_request = ChatCompletionRequest(
            messages=[ChatMessage(role="system", content=system_context)] + history,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=True
        )

        # Determine provider
        provider = None
        if request.model and "gpt" in request.model:
            provider = LLMProvider.OPENAI
        elif request.model and "kimi" in request.model:
            provider = LLMProvider.KIMI
        elif request.model and "deepseek" in request.model:
            provider = LLMProvider.DEEPSEEK
        
        # Get the provider instance
        if not provider:
            provider = list(llm_gateway.providers.keys())[0] if llm_gateway.providers else None
        
        # Convert provider to string key
        if hasattr(provider, 'value'):
            provider_key = provider.value
        else:
            provider_key = str(provider)
        
        if not provider_key or provider_key not in llm_gateway.providers:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No LLM provider available"
            )
        
        provider_instance = llm_gateway.providers[provider_key]
        
        # Create AI message record (will be updated when stream completes)
        ai_message_id = str(uuid.uuid4())
        
        async def stream_generator():
            try:
                full_content = ""
                chunk_count = 0
                total_tokens = 0
                
                # Send initial status
                start_message = StreamingMessage(
                    type="status",
                    content=f"Starting chat with {str(provider)}",
                    message_id=ai_message_id,
                    conversation_id=conversation_id
                )
                yield f"data: {json.dumps(start_message.dict())}\n\n"
                
                # Stream from LLM
                async for chunk in provider_instance.chat_completion_stream(chat_request):
                    full_content += chunk
                    chunk_count += 1
                    
                    # Send chunk to client
                    chunk_message = StreamingMessage(
                        type="chunk",
                        content=chunk,
                        message_id=ai_message_id,
                        conversation_id=conversation_id
                    )
                    yield f"data: {json.dumps(chunk_message.dict())}\n\n"
                    
                    # Small delay to prevent overwhelming the client
                    await asyncio.sleep(0.01)
                
                # Get final token usage
                if hasattr(provider_instance, 'last_usage'):
                    total_tokens = provider_instance.last_usage
                
                # Save AI message to database
                ai_message = Message(
                    id=ai_message_id,
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_content,
                    tokens_used=total_tokens,
                    cost=0.0,  # TODO: Calculate
                    created_at=datetime.utcnow()
                )
                await ai_message.save()
                
                # Update conversation
                conversation.updated_at = datetime.utcnow()
                await conversation.save()
                
                # Send completion message
                completion_message = StreamingMessage(
                    type="complete",
                    content=f"Completed ({chunk_count} chunks)",
                    message_id=ai_message_id,
                    conversation_id=conversation_id
                )
                yield f"data: {json.dumps(completion_message.dict())}\n\n"
                
                # Send final usage stats
                usage = llm_gateway.get_usage_stats()
                usage_message = StreamingMessage(
                    type="usage",
                    content=json.dumps(usage),
                    message_id=ai_message_id,
                    conversation_id=conversation_id
                )
                yield f"data: {json.dumps(usage_message.dict())}\n\n"
                
            except asyncio.CancelledError:
                logger.info("Chat stream cancelled by client")
            except Exception as e:
                logger.error(f"Stream generation error: {e}")
                error_message = StreamingMessage(
                    type="error",
                    content=f"Error: {str(e)}",
                    message_id=ai_message_id,
                    conversation_id=conversation_id
                )
                yield f"data: {json.dumps(error_message.dict())}\n\n"
        
        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "X-Accel-Buffering": "no"  # Disable proxy buffering
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat SSE error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start chat stream: {str(e)}"
        )


@router.get("/stream")
async def chat_stream_get(
    message: str = Query(..., description="The user's message"),
    conversation_id: Optional[str] = Query(None, description="Optional conversation ID"),
    model: Optional[str] = Query(None, description="Specific model to use"),
    temperature: Optional[float] = Query(0.7, ge=0.0, le=2.0, description="Temperature for generation"),
    max_tokens: Optional[int] = Query(1000, description="Max tokens in response"),
    token: Optional[str] = Query(None, description="JWT token (for EventSource clients that cannot set headers)"),
    db=Depends(get_db)
):
    """
    Send a chat message and receive streaming response via Server-Sent Events (GET version).
    Accepts auth token as query param because EventSource cannot send Authorization headers.
    """
    # Authenticate via query-param token
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token erforderlich")
    payload = await verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Ungültiges Token")
    username: str = payload.get("sub", "")
    current_user = await User.find_one({"username": username, "is_active": True})
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Benutzer nicht gefunden")

    try:
        from fastapi.responses import StreamingResponse

        # Get or create conversation
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            conversation = Conversation(
                id=conversation_id,
                user_id=current_user.username,
                title=f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            await conversation.save()
        else:
            conversation = await Conversation.find_one(Conversation.id == conversation_id, Conversation.user_id == current_user.username)
            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Conversation {conversation_id} not found"
                )
        
        # Save user message
        user_message_id = str(uuid.uuid4())
        user_message = Message(
            id=user_message_id,
            conversation_id=conversation_id,
            role="user",
            content=message,
            created_at=datetime.utcnow()
        )
        await user_message.save()

        # Build system context with real DB data + conversation history
        system_context = await build_marketing_context()
        history = await load_conversation_messages(conversation_id)

        # Prepare chat request with streaming
        chat_request = ChatCompletionRequest(
            messages=[ChatMessage(role="system", content=system_context)] + history,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )
        
        # Determine provider
        provider = None
        if model and "gpt" in model:
            provider = LLMProvider.OPENAI
        elif model and "kimi" in model:
            provider = LLMProvider.KIMI
        elif model and "deepseek" in model:
            provider = LLMProvider.DEEPSEEK
        
        # Get the provider instance
        if not provider:
            provider = list(llm_gateway.providers.keys())[0] if llm_gateway.providers else None
        
        # Convert provider to string key
        if hasattr(provider, 'value'):
            provider_key = provider.value
        else:
            provider_key = str(provider)
        
        if not provider_key or provider_key not in llm_gateway.providers:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No LLM provider available"
            )
        
        provider_instance = llm_gateway.providers[provider_key]
        
        # Create AI message record (will be updated when stream completes)
        ai_message_id = str(uuid.uuid4())
        
        async def stream_generator():
            try:
                full_content = ""
                chunk_count = 0
                total_tokens = 0
                
                # Send initial status
                start_message = StreamingMessage(
                    type="status",
                    content=f"Starting chat with {str(provider)}",
                    message_id=ai_message_id,
                    conversation_id=conversation_id
                )
                yield f"data: {json.dumps(start_message.dict())}\n\n"
                
                # Stream from LLM
                async for chunk in provider_instance.chat_completion_stream(chat_request):
                    full_content += chunk
                    chunk_count += 1
                    
                    # Send chunk to client
                    chunk_message = StreamingMessage(
                        type="chunk",
                        content=chunk,
                        message_id=ai_message_id,
                        conversation_id=conversation_id
                    )
                    yield f"data: {json.dumps(chunk_message.dict())}\n\n"
                    
                    # Small delay to prevent overwhelming the client
                    await asyncio.sleep(0.01)
                
                # Get final token usage
                if hasattr(provider_instance, 'last_usage'):
                    total_tokens = provider_instance.last_usage
                
                # Save AI message to database
                ai_message = Message(
                    id=ai_message_id,
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_content,
                    tokens_used=total_tokens,
                    cost=0.0,  # TODO: Calculate
                    created_at=datetime.utcnow()
                )
                await ai_message.save()
                
                # Update conversation
                conversation.updated_at = datetime.utcnow()
                await conversation.save()
                
                # Send completion message
                completion_message = StreamingMessage(
                    type="complete",
                    content="Stream completed",
                    message_id=ai_message_id,
                    conversation_id=conversation_id
                )
                yield f"data: {json.dumps(completion_message.dict())}\n\n"
                
                # Send usage stats
                usage_message = StreamingMessage(
                    type="usage",
                    content=f"Tokens used: {total_tokens}",
                    message_id=ai_message_id,
                    conversation_id=conversation_id
                )
                yield f"data: {json.dumps(usage_message.dict())}\n\n"
                
            except asyncio.CancelledError:
                logger.info("Chat stream cancelled by client")
                raise
            except Exception as e:
                logger.error(f"Stream generation error: {e}")
                error_message = StreamingMessage(
                    type="error",
                    content=f"Error: {str(e)}",
                    message_id=ai_message_id,
                    conversation_id=conversation_id
                )
                yield f"data: {json.dumps(error_message.dict())}\n\n"
        
        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "X-Accel-Buffering": "no"  # Disable proxy buffering
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat stream error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start chat stream: {str(e)}"
        )


@router.get("/conversations/{conversation_id}/history", response_model=ConversationResponse)
async def get_conversation_history(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """
    Get the full message history for a conversation (owned by the authenticated user).
    """
    try:
        conversation = await Conversation.find_one(Conversation.id == conversation_id, Conversation.user_id == current_user.username)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found"
            )
        
        # Get all messages
        messages = await Message.find({"conversation_id": conversation_id}).sort("created_at").to_list()
        
        # Calculate totals
        total_tokens = sum((msg.tokens_used or 0) for msg in messages)
        total_cost = sum((msg.cost or 0.0) for msg in messages)
        
        return ConversationResponse(
            id=conversation.id,
            user_id=conversation.user_id,
            title=conversation.title,
            messages=[
                ChatMessageResponse(
                    id=msg.id,
                    conversation_id=msg.conversation_id,
                    role=msg.role,
                    content=msg.content,
                    timestamp=msg.created_at,
                    tokens_used=msg.tokens_used,
                    cost=float(msg.cost) if msg.cost else 0.0
                )
                for msg in messages
            ],
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            total_tokens=total_tokens,
            total_cost=total_cost
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Conversation history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load conversation history: {str(e)}"
        )


@router.get("/conversations")
async def list_conversations(
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """
    List all conversations for the authenticated user.
    Returns { status, conversations } to match frontend expectations.
    """
    try:
        conversations = await Conversation.find(
            Conversation.user_id == current_user.username
        ).sort([("updated_at", -1)]).to_list()

        result = []
        for conv in conversations:
            message_count = await Message.find({"conversation_id": conv.id}).count()
            result.append({
                "id": conv.id,
                "user_id": conv.user_id,
                "title": conv.title,
                "created_at": conv.created_at,
                "updated_at": conv.updated_at,
                "message_count": message_count,
            })

        return {"status": "success", "conversations": result}

    except Exception as e:
        logger.error(f"List conversations error: {e}")
        return {"status": "success", "conversations": []}


@router.post("/conversations")
async def create_conversation(
    request: CreateConversationRequest,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """
    Create a new conversation for the authenticated user.
    Returns { status, conversation } to match frontend expectations.
    """
    try:
        conversation_id = str(uuid.uuid4())
        title = request.title or f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"

        conversation = Conversation(
            id=conversation_id,
            user_id=current_user.username,
            title=title,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        await conversation.save()
        logger.info(f"✅ Created conversation: {conversation_id} for user: {current_user.username}")

        return {
            "status": "success",
            "conversation": {
                "id": conversation.id,
                "user_id": conversation.user_id,
                "title": conversation.title,
                "messages": [],
                "created_at": conversation.created_at,
                "updated_at": conversation.updated_at,
                "total_tokens": 0,
                "total_cost": 0.0,
                "message_count": 0,
            },
        }

    except Exception as e:
        logger.error(f"Create conversation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}"
        )


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """
    Get a conversation with all its messages (must be owned by the authenticated user).
    Returns { status, conversation } to match frontend expectations.
    """
    try:
        conversation = await Conversation.find_one(Conversation.id == conversation_id, Conversation.user_id == current_user.username)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found"
            )

        messages = await Message.find({"conversation_id": conversation_id}).sort("created_at").to_list()
        total_tokens = sum((msg.tokens_used or 0) for msg in messages)
        total_cost = sum((msg.cost or 0.0) for msg in messages)

        conv_data = {
            "id": conversation.id,
            "user_id": conversation.user_id,
            "title": conversation.title,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
            "total_tokens": total_tokens,
            "total_cost": total_cost,
            "messages": [
                {
                    "id": msg.id,
                    "conversation_id": msg.conversation_id,
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.created_at,
                    "tokens_used": msg.tokens_used,
                    "cost": float(msg.cost) if msg.cost else 0.0,
                }
                for msg in messages
            ],
        }
        return {"status": "success", "conversation": conv_data}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get conversation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load conversation: {str(e)}"
        )


@router.delete("/conversations/{conversation_id}", response_model=Dict[str, str])
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """
    Delete a conversation and all its messages (must be owned by the authenticated user).
    """
    try:
        conversation = await Conversation.find_one(Conversation.id == conversation_id, Conversation.user_id == current_user.username)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found"
            )
        
        # Delete all messages
        await Message.find({"conversation_id": conversation_id}).delete()
        
        # Delete conversation
        await conversation.delete()
        
        logger.info(f"✅ Deleted conversation: {conversation_id}")
        
        return {"status": "success", "message": f"Deleted conversation {conversation_id}"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete conversation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete conversation: {str(e)}"
        )


@router.post("/conversations/{conversation_id}/clear", response_model=Dict[str, str])
async def clear_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """
    Clear all messages in a conversation (must be owned by the authenticated user).
    """
    try:
        conversation = await Conversation.find_one(Conversation.id == conversation_id, Conversation.user_id == current_user.username)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found"
            )
        
        # Delete all messages
        await Message.find({"conversation_id": conversation_id}).delete()
        
        logger.info(f"✅ Cleared conversation: {conversation_id}")
        
        return {"status": "success", "message": f"Cleared conversation {conversation_id}"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clear conversation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear conversation: {str(e)}"
        )


# ============================================
# Chat Status & Health
# ============================================

@router.get("/health")
async def chat_health_check(db=Depends(get_db)):
    """
    Health check for chat functionality
    
    Returns:
        Chat system status
    """
    try:
        from app.llm import llm_gateway
        
        providers = llm_gateway.list_available_providers()
        
        return {
            "status": "healthy" if providers else "degraded",
            "chat_enabled": True,
            "streaming_enabled": True,
            "llm_providers": len(providers),
            "conversations_supported": True
        }
    except Exception as e:
        logger.error(f"Chat health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }