"""
LLM Configuration API Endpoints
CRUD Endpoints für LLM Providers und Configurations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime
from app.db.session import get_db
from app.db.models_llm import LLMProvider, LLMConfig
from app.llm import LLMProvider as LLMProviderEnum, llm_gateway, config_manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm/config", tags=["LLM Config"])


# ── Helper ─────────────────────────────────────────────────────────────────────

def _config_to_dict(config: LLMConfig) -> Dict[str, Any]:
    """Serialize LLMConfig to a plain dict, converting Decimal → float."""
    return {
        "id": config.id,
        "name": config.name,
        "provider_id": config.provider_id,
        "model_name": config.model_name,
        "max_tokens": config.max_tokens,
        "temperature": float(config.temperature),
        "top_p": float(config.top_p),
        "is_active": config.is_active,
        "is_default": config.is_default,
        "cost_per_1k_input_tokens": float(config.cost_per_1k_input_tokens),
        "cost_per_1k_output_tokens": float(config.cost_per_1k_output_tokens),
        "created_at": config.created_at.isoformat(),
        "updated_at": config.updated_at.isoformat() if config.updated_at else None,
    }


# ── Request / Response Models ──────────────────────────────────────────────────

class LLMProviderCreateRequest(BaseModel):
    name: str = Field(..., description="Provider name (openai, kimi, deepseek)")
    display_name: str = Field(..., description="Human-readable provider name")
    base_url: str = Field(..., description="API base URL")
    docs_url: Optional[str] = Field(None, description="Documentation URL")


class LLMProviderResponse(BaseModel):
    id: int
    name: str
    display_name: str
    base_url: str
    docs_url: Optional[str] = None
    created_at: datetime

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}


class LLMConfigCreateRequest(BaseModel):
    name: str = Field(..., description="Configuration name")
    provider_id: int = Field(..., description="Provider ID")
    model_name: str = Field(..., description="Model name (e.g., gpt-3.5-turbo)")
    api_key: str = Field(..., description="API key")
    max_tokens: int = Field(default=4096, description="Maximum tokens")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    is_active: bool = Field(default=False)
    is_default: bool = Field(default=False)
    cost_per_1k_input_tokens: float = Field(default=0.0)
    cost_per_1k_output_tokens: float = Field(default=0.0)

    model_config = {"protected_namespaces": ()}


class LLMConfigUpdateRequest(BaseModel):
    name: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    is_default: Optional[bool] = None
    cost_per_1k_input_tokens: Optional[float] = None
    cost_per_1k_output_tokens: Optional[float] = None

    model_config = {"protected_namespaces": ()}


class LLMConfigListResponse(BaseModel):
    configs: List[Dict[str, Any]]
    total: int
    active_count: int
    default_id: Optional[int] = None


# ── Provider Endpoints ─────────────────────────────────────────────────────────

@router.get("/providers", response_model=List[LLMProviderResponse])
async def list_providers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db=Depends(get_db),
):
    try:
        providers = await LLMProvider.find().skip(skip).limit(limit).to_list()
        return [LLMProviderResponse(**p.dict()) for p in providers]
    except Exception as e:
        logger.exception("list_providers failed")
        raise HTTPException(status_code=500, detail=f"Failed to list providers: {e}")


@router.get("/providers/{provider_id}", response_model=LLMProviderResponse)
async def get_provider(provider_id: int, db=Depends(get_db)):
    try:
        provider = await LLMProvider.get(provider_id)
        if not provider:
            raise HTTPException(status_code=404, detail=f"Provider {provider_id} not found")
        return LLMProviderResponse(**provider.dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("get_provider failed")
        raise HTTPException(status_code=500, detail=f"Failed to get provider: {e}")


@router.post("/providers", response_model=LLMProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_provider(request: LLMProviderCreateRequest, db=Depends(get_db)):
    try:
        existing = await LLMProvider.find_one({"name": request.name})
        if existing:
            raise HTTPException(status_code=400, detail=f"Provider '{request.name}' already exists")

        max_id = await LLMProvider.find().sort([("_id", -1)]).limit(1).to_list()
        next_id = (max_id[0].id + 1) if max_id else 1

        provider = LLMProvider(
            id=next_id,
            name=request.name,
            display_name=request.display_name,
            base_url=request.base_url,
            docs_url=request.docs_url,
            created_at=datetime.utcnow(),
        )
        await provider.save()
        logger.info(f"✅ Provider created: {provider.id} - {provider.name}")
        return LLMProviderResponse(**provider.dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("create_provider failed")
        raise HTTPException(status_code=500, detail=f"Failed to create provider: {e}")


@router.post("/providers/initialize-defaults")
async def initialize_default_providers(db=Depends(get_db)):
    try:
        defaults = [
            {"name": "openai",    "display_name": "OpenAI",           "base_url": "https://api.openai.com/v1",      "docs_url": "https://platform.openai.com/docs"},
            {"name": "kimi",      "display_name": "Kimi (Moonshot AI)","base_url": "https://api.moonshot.cn/v1",    "docs_url": "https://platform.moonshot.cn/docs"},
            {"name": "deepseek",  "display_name": "DeepSeek",         "base_url": "https://api.deepseek.com/v1",   "docs_url": "https://platform.deepseek.com/docs"},
        ]
        created = 0
        for d in defaults:
            if not await LLMProvider.find_one({"name": d["name"]}):
                max_id = await LLMProvider.find().sort([("_id", -1)]).limit(1).to_list()
                next_id = (max_id[0].id + 1) if max_id else 1
                await LLMProvider(id=next_id, created_at=datetime.utcnow(), **d).save()
                created += 1

        return {"status": "success", "message": f"Created {created} default providers", "total_created": created}
    except Exception as e:
        logger.exception("initialize_default_providers failed")
        raise HTTPException(status_code=500, detail=f"Failed to initialize providers: {e}")


# ── Config Endpoints ───────────────────────────────────────────────────────────

@router.get("", response_model=LLMConfigListResponse)
async def list_configs(
    provider_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db=Depends(get_db),
):
    try:
        query: Dict[str, Any] = {}
        if provider_id is not None:
            query["provider_id"] = provider_id
        if is_active is not None:
            query["is_active"] = is_active

        configs = await LLMConfig.find(query).skip(skip).limit(limit).to_list()
        total = await LLMConfig.find(query).count()
        active_count = await LLMConfig.find({"is_active": True}).count()
        default_config = await LLMConfig.find_one({"is_default": True})

        return LLMConfigListResponse(
            configs=[_config_to_dict(c) for c in configs],
            total=total,
            active_count=active_count,
            default_id=default_config.id if default_config else None,
        )
    except Exception as e:
        logger.exception("list_configs failed")
        raise HTTPException(status_code=500, detail=f"Failed to list configs: {e}")


@router.get("/{config_id}")
async def get_config(config_id: int, db=Depends(get_db)):
    try:
        config = await LLMConfig.get(config_id)
        if not config:
            raise HTTPException(status_code=404, detail=f"Config {config_id} not found")
        return {"status": "success", "data": _config_to_dict(config)}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("get_config failed")
        raise HTTPException(status_code=500, detail=f"Failed to get config: {e}")


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_config(request: LLMConfigCreateRequest, db=Depends(get_db)):
    try:
        provider = await LLMProvider.get(request.provider_id)
        if not provider:
            raise HTTPException(
                status_code=400,
                detail=f"Provider with ID {request.provider_id} not found. "
                       f"Please call POST /api/v1/llm/config/providers/initialize-defaults first.",
            )

        if request.is_default:
            existing_default = await LLMConfig.find_one({"is_default": True})
            if existing_default:
                existing_default.is_default = False
                await existing_default.save()

        max_id = await LLMConfig.find().sort([("_id", -1)]).limit(1).to_list()
        next_id = (max_id[0].id + 1) if max_id else 1

        config = LLMConfig(
            id=next_id,
            name=request.name,
            provider_id=request.provider_id,
            model_name=request.model_name,
            api_key_encrypted=request.api_key,
            max_tokens=request.max_tokens,
            temperature=Decimal(str(request.temperature)),
            top_p=Decimal(str(request.top_p)),
            is_active=request.is_active,
            is_default=request.is_default,
            cost_per_1k_input_tokens=Decimal(str(request.cost_per_1k_input_tokens)),
            cost_per_1k_output_tokens=Decimal(str(request.cost_per_1k_output_tokens)),
            created_at=datetime.utcnow(),
        )
        await config.save()
        logger.info(f"✅ Config created: {config.id} - {config.name}")

        if config.is_active:
            db_configs = await config_manager.load_configs_from_db()
            await llm_gateway.initialize(db_configs)

        return {"status": "success", "message": "Konfiguration erfolgreich erstellt", "data": _config_to_dict(config)}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("create_config failed")
        raise HTTPException(status_code=500, detail=f"Failed to create config: {e}")


@router.put("/{config_id}", response_model=Dict[str, Any])
async def update_config(config_id: int, request: LLMConfigUpdateRequest, db=Depends(get_db)):
    try:
        config = await LLMConfig.get(config_id)
        if not config:
            raise HTTPException(status_code=404, detail=f"Config {config_id} not found")

        if request.name is not None:
            config.name = request.name
        if request.model_name is not None:
            config.model_name = request.model_name
        if request.api_key is not None:
            config.api_key_encrypted = request.api_key
        if request.max_tokens is not None:
            config.max_tokens = request.max_tokens
        if request.temperature is not None:
            config.temperature = Decimal(str(request.temperature))
        if request.top_p is not None:
            config.top_p = Decimal(str(request.top_p))
        if request.is_default is not None and request.is_default:
            existing_default = await LLMConfig.find_one(LLMConfig.is_default == True, LLMConfig.id != config_id)
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

        return {"status": "success", "message": "Konfiguration erfolgreich aktualisiert", "data": _config_to_dict(config)}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("update_config failed")
        raise HTTPException(status_code=500, detail=f"Failed to update config: {e}")


@router.delete("/{config_id}", response_model=Dict[str, str])
async def delete_config(config_id: int, db=Depends(get_db)):
    try:
        config = await LLMConfig.get(config_id)
        if not config:
            raise HTTPException(status_code=404, detail=f"Config {config_id} not found")
        await config.delete()
        logger.info(f"✅ Config deleted: {config_id}")
        return {"status": "success", "message": f"Config {config_id} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("delete_config failed")
        raise HTTPException(status_code=500, detail=f"Failed to delete config: {e}")


@router.post("/{config_id}/activate", response_model=Dict[str, Any])
async def activate_config(config_id: int, db=Depends(get_db)):
    try:
        config = await LLMConfig.get(config_id)
        if not config:
            raise HTTPException(status_code=404, detail=f"Config {config_id} not found")
        config.is_active = True
        await config.save()
        db_configs = await config_manager.load_configs_from_db()
        await llm_gateway.initialize(db_configs)
        logger.info(f"✅ Config activated: {config.id}")
        return {"status": "success", "message": "Konfiguration aktiviert", "data": _config_to_dict(config)}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("activate_config failed")
        raise HTTPException(status_code=500, detail=f"Failed to activate config: {e}")


@router.post("/{config_id}/deactivate", response_model=Dict[str, Any])
async def deactivate_config(config_id: int, db=Depends(get_db)):
    try:
        config = await LLMConfig.get(config_id)
        if not config:
            raise HTTPException(status_code=404, detail=f"Config {config_id} not found")
        config.is_active = False
        await config.save()
        db_configs = await config_manager.load_configs_from_db()
        await llm_gateway.initialize(db_configs)
        logger.info(f"✅ Config deactivated: {config.id}")
        return {"status": "success", "message": "Konfiguration deaktiviert", "data": _config_to_dict(config)}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("deactivate_config failed")
        raise HTTPException(status_code=500, detail=f"Failed to deactivate config: {e}")


@router.post("/{config_id}/test", response_model=Dict[str, Any])
async def test_config(config_id: int, db=Depends(get_db)):
    try:
        config = await LLMConfig.get(config_id)
        if not config:
            raise HTTPException(status_code=404, detail=f"Config {config_id} not found")

        provider_doc = await LLMProvider.get(config.provider_id)
        if not provider_doc:
            raise HTTPException(status_code=404, detail=f"Provider {config.provider_id} not found")

        import time
        from app.llm.base import LLMProviderConfig as LLMProviderCfg, ChatCompletionRequest, ChatMessage
        from app.llm.gateway import PROVIDER_CLASSES

        provider_class = PROVIDER_CLASSES.get(provider_doc.name)
        if not provider_class:
            raise HTTPException(status_code=400, detail=f"Unbekannter Provider: {provider_doc.name}")

        provider_cfg = LLMProviderCfg(
            provider=provider_doc.name,
            model=config.model_name,
            api_key=config.api_key_encrypted,
            base_url=provider_doc.base_url,
            max_tokens=10,
            temperature=0.1,
            top_p=1.0,
        )
        instance = provider_class(provider_cfg)
        await instance.initialize()

        start = time.time()
        req = ChatCompletionRequest(
            messages=[ChatMessage(role="user", content="Say OK.")],
            model=config.model_name,
            max_tokens=10,
            temperature=0.1,
        )
        response = await instance.chat_completion(req)
        latency_ms = int((time.time() - start) * 1000)
        content = response.choices[0].get("message", {}).get("content", "") if response.choices else ""
        logger.info(f"✅ Config tested: {config.id}, latency={latency_ms}ms")
        return {"status": "success", "response": content, "latency_ms": latency_ms}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("test_config failed")
        return {"status": "error", "detail": str(e)}


@router.post("/{config_id}/set-default", response_model=Dict[str, Any])
async def set_default_config(config_id: int, db=Depends(get_db)):
    try:
        config = await LLMConfig.get(config_id)
        if not config:
            raise HTTPException(status_code=404, detail=f"Config {config_id} not found")
        await LLMConfig.find(LLMConfig.id != config_id).update({"$set": {"is_default": False}})
        config.is_default = True
        await config.save()
        logger.info(f"✅ Default config set: {config.id}")
        return {"status": "success", "message": "Als Standard gesetzt", "data": _config_to_dict(config)}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("set_default_config failed")
        raise HTTPException(status_code=500, detail=f"Failed to set default config: {e}")