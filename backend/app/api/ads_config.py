"""
Ad Platform Configuration API Endpoints
CRUD Endpoints for Google Ads and Meta Ads configurations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.db.session import get_db
from app.db.models_ads_config import AdPlatformConfig
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ads/config", tags=["Ads Config"])


# ── Helper ─────────────────────────────────────────────────────────────────────

def _config_to_dict(config: AdPlatformConfig) -> Dict[str, Any]:
    """Serialize AdPlatformConfig to a plain dict."""
    return {
        "id": str(config.id),
        "platform": config.platform,
        "name": config.name,
        "is_active": config.is_active,
        "google_client_id": config.google_client_id,
        "google_client_secret": config.google_client_secret,
        "google_refresh_token": config.google_refresh_token,
        "google_developer_token": config.google_developer_token,
        "google_login_customer_id": config.google_login_customer_id,
        "meta_access_token": config.meta_access_token,
        "meta_app_id": config.meta_app_id,
        "meta_ad_account_id": config.meta_ad_account_id,
        "created_at": config.created_at.isoformat(),
        "updated_at": config.updated_at.isoformat() if config.updated_at else None,
    }


# ── Request / Response Models ──────────────────────────────────────────────────

class AdPlatformConfigCreateRequest(BaseModel):
    platform: str = Field(..., description="Platform: google_ads or meta_ads")
    name: str = Field(..., description="User-defined name for this configuration")
    is_active: bool = Field(default=False, description="Whether this config is active")
    # Google Ads fields (optional)
    google_client_id: Optional[str] = Field(None, description="Google Ads client ID")
    google_client_secret: Optional[str] = Field(None, description="Google Ads client secret")
    google_refresh_token: Optional[str] = Field(None, description="Google Ads refresh token")
    google_developer_token: Optional[str] = Field(None, description="Google Ads developer token")
    google_login_customer_id: Optional[str] = Field(None, description="Google Ads login customer ID")
    # Meta Ads fields (optional)
    meta_access_token: Optional[str] = Field(None, description="Meta Ads access token")
    meta_app_id: Optional[str] = Field(None, description="Meta Ads app ID")
    meta_ad_account_id: Optional[str] = Field(None, description="Meta Ads ad account ID")


class AdPlatformConfigUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, description="User-defined name for this configuration")
    is_active: Optional[bool] = Field(None, description="Whether this config is active")
    # Google Ads fields (optional)
    google_client_id: Optional[str] = Field(None, description="Google Ads client ID")
    google_client_secret: Optional[str] = Field(None, description="Google Ads client secret")
    google_refresh_token: Optional[str] = Field(None, description="Google Ads refresh token")
    google_developer_token: Optional[str] = Field(None, description="Google Ads developer token")
    google_login_customer_id: Optional[str] = Field(None, description="Google Ads login customer ID")
    # Meta Ads fields (optional)
    meta_access_token: Optional[str] = Field(None, description="Meta Ads access token")
    meta_app_id: Optional[str] = Field(None, description="Meta Ads app ID")
    meta_ad_account_id: Optional[str] = Field(None, description="Meta Ads ad account ID")


# ── CRUD Endpoints ─────────────────────────────────────────────────────────────

@router.get("", response_model=Dict[str, Any])
async def get_configs(
    platform: Optional[str] = Query(None, description="Filter by platform"),
    db=Depends(get_db)
):
    """
    Get all ad platform configurations, optionally filtered by platform.
    """
    try:
        query = {}
        if platform:
            query["platform"] = platform
        configs = await AdPlatformConfig.find(query).to_list()
        return {
            "status": "success",
            "data": [_config_to_dict(c) for c in configs]
        }
    except Exception as e:
        logger.error(f"Error fetching ad platform configs: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{config_id}", response_model=Dict[str, Any])
async def get_config(config_id: str, db=Depends(get_db)):
    """
    Get a specific ad platform configuration by ID.
    """
    try:
        config = await AdPlatformConfig.get(config_id)
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")
        return {
            "status": "success",
            "data": _config_to_dict(config)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching ad platform config {config_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Dict[str, Any])
async def create_config(request: AdPlatformConfigCreateRequest, db=Depends(get_db)):
    """
    Create a new ad platform configuration.
    """
    try:
        # Validate platform value
        if request.platform not in ["google_ads", "meta_ads"]:
            raise HTTPException(status_code=400, detail="Platform must be 'google_ads' or 'meta_ads'")
        
        # If setting active, deactivate other configs of same platform
        if request.is_active:
            await AdPlatformConfig.find({"platform": request.platform, "is_active": True}).update({"$set": {"is_active": False}})
        
        config = AdPlatformConfig(
            platform=request.platform,
            name=request.name,
            is_active=request.is_active,
            google_client_id=request.google_client_id,
            google_client_secret=request.google_client_secret,
            google_refresh_token=request.google_refresh_token,
            google_developer_token=request.google_developer_token,
            google_login_customer_id=request.google_login_customer_id,
            meta_access_token=request.meta_access_token,
            meta_app_id=request.meta_app_id,
            meta_ad_account_id=request.meta_ad_account_id,
        )
        await config.insert()
        
        return {
            "status": "success",
            "data": _config_to_dict(config),
            "message": "Configuration created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating ad platform config: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.put("/{config_id}", response_model=Dict[str, Any])
async def update_config(config_id: str, request: AdPlatformConfigUpdateRequest, db=Depends(get_db)):
    """
    Update an existing ad platform configuration.
    """
    try:
        config = await AdPlatformConfig.get(config_id)
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")
        
        # If activating, deactivate other configs of same platform
        if request.is_active is not None and request.is_active:
            await AdPlatformConfig.find({"platform": config.platform, "is_active": True, "_id": {"$ne": config.id}}).update({"$set": {"is_active": False}})
        
        # Update fields if provided
        update_data = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.is_active is not None:
            update_data["is_active"] = request.is_active
        if request.google_client_id is not None:
            update_data["google_client_id"] = request.google_client_id
        if request.google_client_secret is not None:
            update_data["google_client_secret"] = request.google_client_secret
        if request.google_refresh_token is not None:
            update_data["google_refresh_token"] = request.google_refresh_token
        if request.google_developer_token is not None:
            update_data["google_developer_token"] = request.google_developer_token
        if request.google_login_customer_id is not None:
            update_data["google_login_customer_id"] = request.google_login_customer_id
        if request.meta_access_token is not None:
            update_data["meta_access_token"] = request.meta_access_token
        if request.meta_app_id is not None:
            update_data["meta_app_id"] = request.meta_app_id
        if request.meta_ad_account_id is not None:
            update_data["meta_ad_account_id"] = request.meta_ad_account_id
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            await config.update({"$set": update_data})
            await config.reload()
        
        return {
            "status": "success",
            "data": _config_to_dict(config),
            "message": "Configuration updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating ad platform config {config_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/{config_id}", response_model=Dict[str, Any])
async def delete_config(config_id: str, db=Depends(get_db)):
    """
    Delete an ad platform configuration.
    """
    try:
        config = await AdPlatformConfig.get(config_id)
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")
        
        await config.delete()
        
        return {
            "status": "success",
            "message": "Configuration deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting ad platform config {config_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{config_id}/activate", response_model=Dict[str, Any])
async def activate_config(config_id: str, db=Depends(get_db)):
    """
    Activate a configuration (deactivates others of the same platform).
    """
    try:
        config = await AdPlatformConfig.get(config_id)
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")
        
        # Deactivate other configs of same platform
        await AdPlatformConfig.find({"platform": config.platform, "is_active": True, "_id": {"$ne": config.id}}).update({"$set": {"is_active": False}})
        
        # Activate this config
        config.is_active = True
        config.updated_at = datetime.utcnow()
        await config.save()
        
        return {
            "status": "success",
            "data": _config_to_dict(config),
            "message": "Configuration activated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating ad platform config {config_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{config_id}/deactivate", response_model=Dict[str, Any])
async def deactivate_config(config_id: str, db=Depends(get_db)):
    """
    Deactivate a configuration.
    """
    try:
        config = await AdPlatformConfig.get(config_id)
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")
        
        config.is_active = False
        config.updated_at = datetime.utcnow()
        await config.save()
        
        return {
            "status": "success",
            "data": _config_to_dict(config),
            "message": "Configuration deactivated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating ad platform config {config_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/platform/{platform}", response_model=Dict[str, Any])
async def get_configs_by_platform(platform: str, db=Depends(get_db)):
    """
    Get all configurations for a specific platform.
    """
    try:
        if platform not in ["google_ads", "meta_ads"]:
            raise HTTPException(status_code=400, detail="Platform must be 'google_ads' or 'meta_ads'")
        
        configs = await AdPlatformConfig.find({"platform": platform}).to_list()
        return {
            "status": "success",
            "data": [_config_to_dict(c) for c in configs]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching configs for platform {platform}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/status/active", response_model=Dict[str, Any])
async def get_active_configs_status(db=Depends(get_db)):
    """
    Get status of active configurations (which platforms have active configs).
    """
    try:
        active_configs = await AdPlatformConfig.find({"is_active": True}).to_list()
        result = {}
        for config in active_configs:
            result[config.platform] = {
                "config_id": str(config.id),
                "name": config.name,
                "has_credentials": (
                    (config.platform == "google_ads" and config.google_client_id and config.google_refresh_token and config.google_developer_token) or
                    (config.platform == "meta_ads" and config.meta_access_token and config.meta_app_id and config.meta_ad_account_id)
                )
            }
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        logger.error(f"Error fetching active configs status: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")