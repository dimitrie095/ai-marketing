"""
LLM Configuration API Endpoints
B-03: LLM Config CRUD Endpoints
API for managing LLM Providers and Configurations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.db.session import get_db
from app.db.models_llm import LLMProvider, LLMConfig
from app.llm import LLMProvider as LLMProviderEnum, llm_gateway, config_manager
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm/config", tags=["LLM Config"])

# ============================================
# Request/Response Models
# ============================================

class LLMProviderCreateRequest(BaseModel):
    """Request to create an LLM Provider"""
    name: str = Field(..., description="Provider name (openai, kimi, deepseek)")
    display_name: str = Field(..., description="Human-readable provider name")
    base_url: str = Field(..., description="API base URL")
    docs_url: Optional[str] = Field(None, description="Documentation URL")


class LLMProviderResponse(BaseModel):
    """Response with LLM Provider data"""
    id: int
    name: str
    display_name: str
    base_url: str
    docs_url: Optional[str] = None
    created_at: datetime
    
    model_config = {
        'json_encoders': {
            datetime: lambda v: v.isoformat()
        }
    }


class LLMConfigCreateRequest(BaseModel):
    """Request to create an LLM Configuration"""
    name: str = Field(..., description="Configuration name")
    provider_id: int = Field(..., description="Provider ID")
    model_name: str = Field(..., description="Model name (e.g., gpt-3.5-turbo)")
    api_key: str = Field(..., description="API key (will be stored securely)")
    max_tokens: int = Field(default=4096, description="Maximum tokens")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Temperature")
    top_p: float = Field(default=1.0, ge=0.0, le=1.0, description="Top P")
    is_active: bool = Field(default=False, description="Is this config active")
    is_default: bool = Field(default=False, description="Is this the default config")
    cost_per_1k_input_tokens: float = Field(default=0.0, description="Cost per 1k input tokens")
    cost_per_1k_output_tokens: float = Field(default=0.0, description="Cost per 1k output tokens")
    
    model_config = {'protected_namespaces': ()}


class LLMConfigUpdateRequest(BaseModel):
    """Request to update an LLM Configuration"""
    name: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    is_default: Optional[bool] = None
    cost_per_1k_input_tokens: Optional[float] = None
    cost_per_1k_output_tokens: Optional[float] = None
    
    model_config = {'protected_namespaces': ()}


class LLMConfigResponse(BaseModel):
    """Response with LLM Configuration data"""
    id: int
    name: str
    provider_id: int
    model_name: str
    max_tokens: int
    temperature: float
    top_p: float
    is_active: bool
    is_default: bool
    cost_per_1k_input_tokens: float
    cost_per_1k_output_tokens: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {
        'protected_namespaces': (),
        'json_encoders': {
            datetime: lambda v: v.isoformat()
        }
    }


class LLMConfigListResponse(BaseModel):
    """Response with list of configurations"""
    configs: List[LLMConfigResponse]
    total: int
    active_count: int
    default_id: Optional[int] = None


# ============================================
# Provider Endpoints
# ============================================

@router.get("/providers", response_model=List[LLMProviderResponse])
async def list_providers(
    skip: int = Query(0, ge=0, description="Number of providers to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max providers to return"),
    db=Depends(get_db)
):
    """
    List all LLM providers
    
    Returns:
        List of providers
    """
    try:
        providers = await LLMProvider.find().skip(skip).limit(limit).to_list()
        total = await LLMProvider.find().count()
        
        return [LLMProviderResponse(**provider.dict()) for provider in providers]
    except Exception as e:
        logger.error(f"Error listing providers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list providers: {str(e)}"
        )


@router.get("/providers/{provider_id}", response_model=LLMProviderResponse)
async def get_provider(
    provider_id: int,
    db=Depends(get_db)
):
    """
    Get a specific provider by ID
    
    Args:
        provider_id: Provider ID
        
    Returns:
        Provider details
    """
    try:
        provider = await LLMProvider.find_one({"id": provider_id})
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Provider with ID {provider_id} not found"
            )
        
        return LLMProviderResponse(**provider.dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting provider: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get provider: {str(e)}"
        )


@router.post("/providers", response_model=LLMProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_provider(
    request: LLMProviderCreateRequest,
    db=Depends(get_db)
):
    """
    Create a new LLM provider
    
    Args:
        request: Provider creation request
        
    Returns:
        Created provider
    """
    try:
        # Check if provider already exists
        existing = await LLMProvider.find_one({"name": request.name})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Provider with name '{request.name}' already exists"
            )
        
        # Get next ID
        max_id = await LLMProvider.find().sort("id", -1).limit(1).to_list()
        next_id = (max_id[0].id + 1) if max_id else 1
        
        # Create provider
        provider = LLMProvider(
            id=next_id,
            name=request.name,
            display_name=request.display_name,
            base_url=request.base_url,
            docs_url=request.docs_url,
            created_at=datetime.utcnow()
        )
        
        await provider.save()
        logger.info(f"✅ Provider created: {provider.id} - {provider.name}")
        
        return LLMProviderResponse(**provider.dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating provider: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create provider: {str(e)}"
        )


# ============================================
# Configuration Endpoints
# ============================================

@router.get("", response_model=LLMConfigListResponse)
async def list_configs(
    provider_id: Optional[int] = Query(None, description="Filter by provider"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Number of configs to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max configs to return"),
    db=Depends(get_db)
):
    """
    List all LLM configurations with optional filters
    
    Returns:
        List of configurations
    """
    try:
        query = {}
        if provider_id is not None:
            query["provider_id"] = provider_id
        if is_active is not None:
            query["is_active"] = is_active
        
        configs = await LLMConfig.find(query).skip(skip).limit(limit).to_list()
        total = await LLMConfig.find(query).count()
        
        # Get default config
        default_config = await LLMConfig.find_one({"is_default": True})
        
        active_count = await LLMConfig.find({"is_active": True}).count()
        
        return LLMConfigListResponse(
            configs=[LLMConfigResponse(**config.dict()) for config in configs],
            total=total,
            active_count=active_count,
            default_id=default_config.id if default_config else None
        )
    except Exception as e:
        logger.error(f"Error listing configs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list configs: {str(e)}"
        )


@router.get("/{config_id}", response_model=LLMConfigResponse)
async def get_config(
    config_id: int,
    db=Depends(get_db)
):
    """
    Get a specific configuration by ID
    
    Args:
        config_id: Configuration ID
        
    Returns:
        Configuration details
    """
    try:
        config = await LLMConfig.find_one({"id": config_id})
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Config with ID {config_id} not found"
            )
        
        return LLMConfigResponse(**config.dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get config: {str(e)}"
        )


@router.post("", response_model=LLMConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_config(
    request: LLMConfigCreateRequest,
    db=Depends(get_db)
):
    """
    Create a new LLM configuration
    
    Args:
        request: Config creation request
        
    Returns:
        Created configuration
    """
    try:
        # Check if provider exists
        provider = await LLMProvider.find_one({"id": request.provider_id})
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Provider with ID {request.provider_id} not found"
            )
        
        # Check if default config already exists
        if request.is_default:
            existing_default = await LLMConfig.find_one({"is_default": True})
            if existing_default:
                # Remove default from existing
                existing_default.is_default = False
                await existing_default.save()
        
        # Get next ID
        max_id = await LLMConfig.find().sort("id", -1).limit(1).to_list()
        next_id = (max_id[0].id + 1) if max_id else 1
        
        # Create config
        config = LLMConfig(
            id=next_id,
            name=request.name,
            provider_id=request.provider_id,
            model_name=request.model_name,
            api_key_encrypted=request.api_key,  # TODO: Implement encryption
            max_tokens=request.max_tokens,
            temperature=Decimal(str(request.temperature)),
            top_p=Decimal(str(request.top_p)),
            is_active=request.is_active,
            is_default=request.is_default,
            cost_per_1k_input_tokens=Decimal(str(request.cost_per_1k_input_tokens)),
            cost_per_1k_output_tokens=Decimal(str(request.cost_per_1k_output_tokens)),
            created_at=datetime.utcnow()
        )
        
        await config.save()
        logger.info(f"✅ Config created: {config.id} - {config.name}")
        
        # Reinitialize LLM gateway if config is active
        if config.is_active:
            configs = config_manager.load_configs_from_env()
            await llm_gateway.initialize(configs)
        
        return LLMConfigResponse(**config.dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create config: {str(e)}"
        )


@router.put("/{config_id}", response_model=LLMConfigResponse)
async def update_config(
    config_id: int,
    request: LLMConfigUpdateRequest,
    db=Depends(get_db)
):
    """
    Update an existing LLM configuration
    
    Args:
        config_id: Configuration ID
        request: Update request
        
    Returns:
        Updated configuration
    """
    try:
        config = await LLMConfig.find_one({"id": config_id})
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Config with ID {config_id} not found"
            )
        
        # Update fields
        if request.name is not None:
            config.name = request.name
        if request.model_name is not None:
            config.model_name = request.model_name
        if request.api_key is not None:
            config.api_key_encrypted = request.api_key  # TODO: Encrypt
        if request.max_tokens is not None:
            config.max_tokens = request.max_tokens
        if request.temperature is not None:
            config.temperature = Decimal(str(request.temperature))
        if request.top_p is not None:
            config.top_p = Decimal(str(request.top_p))
        if request.is_default is not None and request.is_default:
            # Remove default from other configs
            existing_default = await LLMConfig.find_one({"is_default": True, "id": {"$ne": config_id}})
            if existing_default:
                existing_default.is_default = False
                await existing_default.save()
            config.is_default = True
        if request.cost_per_1k_input_tokens is not None:
            config.cost_per_1k_input_tokens = Decimal(str(request.cost_per_1k_input_tokens))
        if request.cost_per_1k_output_tokens is not None:
            config.cost_per_1k_output_tokens = Decimal(str(request.cost_per_1k_output_tokens))
        
        config.updated_at = datetime.utcnow()
        
        await config.save()
        logger.info(f"✅ Config updated: {config.id} - {config.name}")
        
        return LLMConfigResponse(**config.dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update config: {str(e)}"
        )


@router.delete("/{config_id}", response_model=Dict[str, str])
async def delete_config(
    config_id: int,
    db=Depends(get_db)
):
    """
    Delete an LLM configuration
    
    Args:
        config_id: Configuration ID
        
    Returns:
        Success message
    """
    try:
        config = await LLMConfig.find_one({"id": config_id})
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Config with ID {config_id} not found"
            )
        
        await config.delete()
        logger.info(f"✅ Config deleted: {config_id}")
        
        return {"status": "success", "message": f"Config {config_id} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete config: {str(e)}"
        )


@router.post("/{config_id}/activate", response_model=LLMConfigResponse)
async def activate_config(
    config_id: int,
    db=Depends(get_db)
):
    """
    Activate an LLM configuration
    
    Args:
        config_id: Configuration ID
        
    Returns:
        Updated configuration
    """
    try:
        config = await LLMConfig.find_one({"id": config_id})
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Config with ID {config_id} not found"
            )
        
        config.is_active = True
        await config.save()
        
        # Reinitialize LLM gateway
        configs = config_manager.load_configs_from_env()
        await llm_gateway.initialize(configs)
        
        logger.info(f"✅ Config activated: {config.id}")
        
        return LLMConfigResponse(**config.dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to activate config: {str(e)}"
        )


@router.post("/{config_id}/deactivate", response_model=LLMConfigResponse)
async def deactivate_config(
    config_id: int,
    db=Depends(get_db)
):
    """
    Deactivate an LLM configuration
    
    Args:
        config_id: Configuration ID
        
    Returns:
        Updated configuration
    """
    try:
        config = await LLMConfig.find_one({"id": config_id})
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Config with ID {config_id} not found"
            )
        
        config.is_active = False
        await config.save()
        
        # Reinitialize LLM gateway
        configs = config_manager.load_configs_from_env()
        await llm_gateway.initialize(configs)
        
        logger.info(f"✅ Config deactivated: {config.id}")
        
        return LLMConfigResponse(**config.dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate config: {str(e)}"
        )


@router.post("/{config_id}/set-default", response_model=LLMConfigResponse)
async def set_default_config(
    config_id: int,
    db=Depends(get_db)
):
    """
    Set a configuration as default
    
    Args:
        config_id: Configuration ID
        
    Returns:
        Updated configuration
    """
    try:
        config = await LLMConfig.find_one({"id": config_id})
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Config with ID {config_id} not found"
            )
        
        # Remove default from all other configs
        await LLMConfig.find({"id": {"$ne": config_id}}).update({"$set": {"is_default": False}})
        
        # Set this as default
        config.is_default = True
        await config.save()
        
        logger.info(f"✅ Default config set: {config.id}")
        
        return LLMConfigResponse(**config.dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting default config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set default config: {str(e)}"
        )


# ============================================
# Provider Standard Models
# ============================================

@router.post("/providers/initialize-defaults")
async def initialize_default_providers(db=Depends(get_db)):
    """
    Initialize default LLM providers (OpenAI, Kimi, DeepSeek)
    
    Returns:
        Status of initialization
    """
    try:
        default_providers = [
            {
                "name": "openai",
                "display_name": "OpenAI",
                "base_url": "https://api.openai.com/v1",
                "docs_url": "https://platform.openai.com/docs"
            },
            {
                "name": "kimi",
                "display_name": "Kimi (Moonshot AI)",
                "base_url": "https://api.moonshot.cn/v1",
                "docs_url": "https://platform.moonshot.cn/docs"
            },
            {
                "name": "deepseek",
                "display_name": "DeepSeek",
                "base_url": "https://api.deepseek.com/v1",
                "docs_url": "https://platform.deepseek.com/docs"
            }
        ]
        
        created = 0
        for provider_data in default_providers:
            existing = await LLMProvider.find_one({"name": provider_data["name"]})
            if not existing:
                # Get next ID
                max_id = await LLMProvider.find().sort("id", -1).limit(1).to_list()
                next_id = (max_id[0].id + 1) if max_id else 1
                
                provider = LLMProvider(
                    id=next_id,
                    name=provider_data["name"],
                    display_name=provider_data["display_name"],
                    base_url=provider_data["base_url"],
                    docs_url=provider_data["docs_url"],
                    created_at=datetime.utcnow()
                )
                await provider.save()
                created += 1
        
        return {
            "status": "success",
            "message": f"Created {created} default providers",
            "total_created": created
        }
    except Exception as e:
        logger.error(f"Error initializing default providers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize default providers: {str(e)}"
        )