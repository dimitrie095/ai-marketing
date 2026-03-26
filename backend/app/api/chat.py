"""
Real-time Chat API with Server-Sent Events
B-06: Chat SSE Endpoint
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import asyncio
import json
import uuid
from pydantic import BaseModel, Field
from fastapi.responses import StreamingResponse
from app.db.session import get_db
from app.db.models_llm import Conversation, Message
from app.llm import llm_gateway, LLMProvider, ChatCompletionRequest, ChatMessage
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


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
    db=Depends(get_db)
):
    """
    Send a chat message and get a response
    
    Args:
        request: Chat message request
        
    Returns:
        AI response with message data
    """
    try:
        # Get or create conversation
        conversation_id = request.conversation_id
        
        if not conversation_id:
            # Create new conversation
            conversation_id = str(uuid.uuid4())
            conversation = Conversation(
                id=conversation_id,
                user_id="anonymous",  # TODO: Get from auth
                title=f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            await conversation.save()
        else:
            conversation = await Conversation.find_one({"id": conversation_id})
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
        
        # Prepare chat request
        chat_request = ChatCompletionRequest(
            messages=[
                ChatMessage(role="user", content=request.message)
            ],
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
    db=Depends(get_db)
):
    """
    Send a chat message and receive streaming response via Server-Sent Events
    
    Args:
        request: Chat message request
        
    Returns:
        Server-Sent Events stream with AI response
    """
    try:
        from fastapi.responses import StreamingResponse
        
        # Get or create conversation
        conversation_id = request.conversation_id
        
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            conversation = Conversation(
                id=conversation_id,
                user_id="anonymous",
                title=f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            await conversation.save()
        else:
            conversation = await Conversation.find_one({"id": conversation_id})
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
        
        # Prepare chat request with streaming
        chat_request = ChatCompletionRequest(
            messages=[
                ChatMessage(role="user", content=request.message)
            ],
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
        
        if not provider or provider not in llm_gateway.providers:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No LLM provider available"
            )
        
        provider_instance = llm_gateway.providers[provider]
        
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
                    content=f"Starting chat with {provider.value}",
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


@router.get("/conversations/{conversation_id}/history", response_model=ConversationResponse)
async def get_conversation_history(
    conversation_id: str,
    db=Depends(get_db)
):
    """
    Get the full message history for a conversation
    
    Args:
        conversation_id: Conversation ID
        
    Returns:
        Conversation with all messages
    """
    try:
        # Get conversation
        conversation = await Conversation.find_one({"id": conversation_id})
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


@router.get("/conversations", response_model=List[Dict[str, Any]])
async def list_conversations(
    user_id: Optional[str] = Query(None, description="Filter by user"),
    skip: int = Query(0, ge=0, description="Number to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max to return"),
    db=Depends(get_db)
):
    """
    List all conversations for a user
    
    Args:
        user_id: Optional user ID filter
        skip: Number to skip for pagination
        limit: Max to return
        
    Returns:
        List of conversations
    """
    try:
        query = {}
        if user_id:
            query["user_id"] = user_id
        
        conversations = await Conversation.find(query).skip(skip).limit(limit).sort("updated_at", -1).to_list()
        
        # Add message counts
        result = []
        for conv in conversations:
            message_count = await Message.find({"conversation_id": conv.id}).count()
            result.append({
                "id": conv.id,
                "user_id": conv.user_id,
                "title": conv.title,
                "created_at": conv.created_at,
                "updated_at": conv.updated_at,
                "message_count": message_count
            })
        
        return result
        
    except Exception as e:
        logger.error(f"List conversations error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list conversations: {str(e)}"
        )


@router.delete("/conversations/{conversation_id}", response_model=Dict[str, str])
async def delete_conversation(
    conversation_id: str,
    db=Depends(get_db)
):
    """
    Delete a conversation and all its messages
    
    Args:
        conversation_id: Conversation ID
        
    Returns:
        Success message
    """
    try:
        conversation = await Conversation.find_one({"id": conversation_id})
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