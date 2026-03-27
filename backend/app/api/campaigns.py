"""
Marketing Kampagnen API
Phase 2: B-04 - CRUD Endpoints für Campaigns, AdSets, Ads
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
import logging
import uuid

# Try to import database dependencies
try:
    from app.db.session import get_db, is_db_available
    from app.db.models import Campaign, AdSet, Ad, Metric, User
    DB_AVAILABLE = True
    print("[Campaigns API] Database module imported successfully")
except ImportError as e:
    DB_AVAILABLE = False
    User = None  # type: ignore
    get_db = lambda: None
    is_db_available = lambda: False
    print(f"[Campaigns API] Database not available, using demo mode: {e}")

# Try to import authentication (optional for demo mode)
try:
    from app.core.auth import get_current_active_user
    AUTH_AVAILABLE = True
except ImportError:
    AUTH_AVAILABLE = False
    get_current_active_user = None  # type: ignore
    print("[Campaigns API] Authentication not available")

# Import demo storage service
try:
    from app.services.demo_storage import (
        load_demo_campaigns,
        save_demo_campaigns,
        find_campaign,
        add_campaign,
        update_campaign,
        delete_campaign,
        get_default_campaigns,
        add_adset
    )
    STORAGE_AVAILABLE = True
    print("[Campaigns API] Demo storage service loaded")
except ImportError as e:
    STORAGE_AVAILABLE = False
    print(f"[Campaigns API] Could not load storage service: {e}")

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])
logger = logging.getLogger(__name__)


# Authentication wrapper for demo mode compatibility
async def get_current_user_or_demo():
    """Get current user if auth available, otherwise return demo user"""
    if AUTH_AVAILABLE and DB_AVAILABLE:
        # Real authentication
        return await get_current_active_user()
    elif DB_AVAILABLE:
        # DB available but no auth - return dummy user for now
        # In production, you should require authentication
        logger.warning("No authentication configured, using demo user")
        return None
    else:
        # Demo mode - no authentication needed
        return None

# Initialize demo data
if STORAGE_AVAILABLE:
    logger.info("[Campaigns API] Loading demo data storage...")
    _demo_campaigns, _demo_adsets = load_demo_campaigns()
    logger.info(f"[Campaigns API] Loaded {len(_demo_campaigns)} campaigns from storage")
else:
    _demo_campaigns = []
    _demo_adsets = {}


# ============================================
# Request/Response Models
# ============================================

class CampaignCreateRequest(BaseModel):
    """Request Model für Campaign Creation"""
    name: str
    status: str = "ACTIVE"
    objective: Optional[str] = None
    
    class Config:
        extra = "forbid"


class CampaignUpdateRequest(BaseModel):
    """Request Model für Campaign Updates"""
    name: Optional[str] = None
    status: Optional[str] = None
    objective: Optional[str] = None
    version: Optional[int] = None  # For optimistic locking


class AdSetCreateRequest(BaseModel):
    """Request Model für AdSet Creation"""
    name: str
    status: str = "ACTIVE"
    daily_budget: Optional[float] = None
    lifetime_budget: Optional[float] = None
    optimization_goal: Optional[str] = None
    billing_event: Optional[str] = None
    
    class Config:
        extra = "forbid"


class CampaignResponse(BaseModel):
    """Response Model für Campaigns"""
    id: str
    name: str
    status: str
    objective: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    synced_at: Optional[datetime] = None
    ad_sets_count: int = 0
    total_spend: float = 0.0
    total_revenue: float = 0.0
    
    class Config:
        json_encoders = {
            Decimal: float
        }


class AdSetResponse(BaseModel):
    """Response Model für AdSets"""
    id: str
    campaign_id: str
    name: str
    status: str
    daily_budget: Optional[float] = None
    lifetime_budget: Optional[float] = None
    optimization_goal: Optional[str] = None
    billing_event: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    synced_at: Optional[datetime] = None
    ads_count: int = 0
    
    class Config:
        json_encoders = {
            Decimal: float
        }


class AdResponse(BaseModel):
    """Response Model für Ads"""
    id: str
    ad_set_id: str
    name: str
    status: str
    creative_type: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    synced_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            Decimal: float
        }


# ============================================
# Campaign Endpoints
# ============================================

@router.get("", response_model=Dict[str, Any])
async def list_campaigns(
    skip: int = Query(0, ge=0, description="Anzahl der zu überspringenden Einträge"),
    limit: int = Query(100, ge=1, le=1000, description="Maximale Anzahl der zurückzugebenden Einträge"),
    status: Optional[str] = Query(None, description="Filter nach Status (ACTIVE, PAUSED, etc.)"),
    db=Depends(get_db)
):
    """
    Liste aller Kampagnen mit Pagination und optionalen Filtern
    
    Beispiel:
    ```
    GET /api/v1/campaigns?skip=0&limit=10&status=ACTIVE
    ```
    """
    # Return demo data if database not available
    if not DB_AVAILABLE or not is_db_available():
        filtered = _demo_campaigns
        if status:
            filtered = [c for c in filtered if c["status"] == status]
        total = len(filtered)
        paginated = filtered[skip:skip + limit]
        return {
            "status": "success",
            "message": "Demo-Daten (Datenbank nicht verfügbar)",
            "data": paginated,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + limit) < total
            }
        }
    
    try:
        # Base query
        query = {}
        if status:
            query["status"] = status
        
        # Get campaigns
        campaigns = await Campaign.find(query).skip(skip).limit(limit).to_list()
        total = await Campaign.find(query).count()
        
        # Enrich with additional data
        response_items = []
        for campaign in campaigns:
            # Count adsets
            ad_sets_count = await AdSet.find({"campaign_id": campaign.id}).count()
            
            # Calculate total spend and revenue from metrics
            campaign_metrics = await Metric.find({
                "entity_type": "campaign",
                "entity_id": campaign.id
            }).to_list()
            
            total_spend = sum(float(m.spend) for m in campaign_metrics)
            total_revenue = sum(float(m.revenue) for m in campaign_metrics)
            
            response_items.append(CampaignResponse(
                id=campaign.id,
                name=campaign.name,
                status=campaign.status,
                objective=campaign.objective,
                created_at=campaign.created_at,
                updated_at=campaign.updated_at,
                synced_at=campaign.synced_at,
                ad_sets_count=ad_sets_count,
                total_spend=total_spend,
                total_revenue=total_revenue
            ))
        
        return {
            "status": "success",
            "data": response_items,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + limit) < total
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Laden der Kampagnen: {str(e)}"
        )


@router.get("/{campaign_id}", response_model=Dict[str, Any])
async def get_campaign(
    campaign_id: str,
    db=Depends(get_db)
):
    """
    Details einer spezifischen Kampagne
    
    Beispiel:
    ```
    GET /api/v1/campaigns/23853712345678901
    ```
    """
    # Return demo data if database not available
    print(f"[Campaigns API] DB_AVAILABLE={DB_AVAILABLE}, STORAGE_AVAILABLE={STORAGE_AVAILABLE}, is_db_available={is_db_available()}")
    if not is_db_available():
        print(f"[Campaigns API] Looking for campaign: {campaign_id} (demo mode)")
        campaign = find_campaign(_demo_campaigns, campaign_id)
        if not campaign:
            print(f"[Campaigns API] Campaign {campaign_id} not found! Available: {[c['id'] for c in _demo_campaigns]}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kampagne mit ID {campaign_id} nicht gefunden"
            )
        print(f"[Campaigns API] Found campaign: {campaign['name']}")
        # Write debug file
        try:
            with open('debug_campaign.txt', 'w') as f:
                f.write(f'Demo path triggered for {campaign_id}')
        except Exception as e:
            print(f"Debug write failed: {e}")
        # Ensure campaign data is JSON serializable
        try:
            import json
            json.dumps(campaign)
        except Exception as e:
            print(f"[Campaigns API] Campaign data not JSON serializable: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Invalid campaign data: {e}"
            )
        return {
            "status": "success",
            "message": "Demo-Daten (Datenbank nicht verfügbar)",
            "data": campaign
        }
    
    try:
        print(f"[Campaigns API] DB lookup for campaign: {campaign_id}")
        campaign = await Campaign.get(campaign_id)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kampagne mit ID {campaign_id} nicht gefunden"
            )
        
        # Count adsets
        ad_sets_count = await AdSet.find({"campaign_id": campaign_id}).count()
        
        # Get metrics summary
        campaign_metrics = await Metric.find({
            "entity_type": "campaign",
            "entity_id": campaign_id
        }).to_list()
        
        total_spend = sum(float(m.spend) for m in campaign_metrics)
        total_revenue = sum(float(m.revenue) for m in campaign_metrics)
        
        campaign_data = CampaignResponse(
            id=campaign.id,
            name=campaign.name,
            status=campaign.status,
            objective=campaign.objective,
            created_at=campaign.created_at,
            updated_at=campaign.updated_at,
            synced_at=campaign.synced_at,
            ad_sets_count=ad_sets_count,
            total_spend=total_spend,
            total_revenue=total_revenue
        )
        
        return {
            "status": "success",
            "data": campaign_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Abrufen der Kampagne: {str(e)}"
        )


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_campaign(
    request: CampaignCreateRequest,
    current_user=Depends(get_current_user_or_demo),
    db=Depends(get_db)
):
    """
    Neue Kampagne erstellen
    
    Beispiel:
    ```
    POST /api/v1/campaigns
    {
        "name": "Neue Kampagne Q2 2025",
        "status": "ACTIVE",
        "objective": "CONVERSIONS"
    }
    ```
    """
    # Demo mode - add to demo data
    if not DB_AVAILABLE and STORAGE_AVAILABLE:
        generated_id = uuid.uuid4().hex
        print(f"[Campaigns API] Creating campaign with generated ID: {generated_id}")
        new_campaign = {
            "id": generated_id,
            "name": request.name,
            "status": request.status,
            "objective": request.objective,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "synced_at": None,
            "ad_sets_count": 0,
            "total_spend": 0.0,
            "total_revenue": 0.0
        }
        # Use storage service to add campaign
        _demo_campaigns[:], _demo_adsets = add_campaign(_demo_campaigns, _demo_adsets, new_campaign)
        if save_demo_campaigns(_demo_campaigns, _demo_adsets):
            logger.info("Campaign saved to storage")
        else:
            logger.warning("Failed to save campaign to storage")
        return {
            "status": "success",
            "message": "Demo: Kampagne erstellt (Datenbank nicht verfügbar)",
            "data": new_campaign
        }
    
    try:
        # Generate unique campaign ID
        generated_id = uuid.uuid4().hex
        # Ensure ID is unique (extremely unlikely collision but safe)
        while await Campaign.get(generated_id) is not None:
            generated_id = uuid.uuid4().hex
        
        # Create campaign
        campaign = Campaign(
            id=generated_id,
            name=request.name,
            status=request.status,
            objective=request.objective,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        await campaign.save()
        
        return {
            "status": "success",
            "message": "Kampagne erfolgreich erstellt",
            "data": {
                "id": campaign.id,
                "name": campaign.name
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Erstellen der Kampagne: {str(e)}"
        )


@router.put("/{campaign_id}", response_model=Dict[str, Any])
async def update_campaign(
    campaign_id: str,
    request: CampaignUpdateRequest,
    current_user=Depends(get_current_user_or_demo),
    db=Depends(get_db)
):
    """
    Kampagne aktualisieren
    
    Beispiel:
    ```
    PUT /api/v1/campaigns/23853712345678901
    {
        "status": "PAUSED"
    }
    ```
    """
    # Demo mode
    if not DB_AVAILABLE:
        campaign = next((c for c in _demo_campaigns if c["id"] == campaign_id), None)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kampagne mit ID {campaign_id} nicht gefunden"
            )
        
        # Update fields
        if request.name:
            campaign["name"] = request.name
        if request.status:
            campaign["status"] = request.status
        if request.objective:
            campaign["objective"] = request.objective
        
        campaign["updated_at"] = datetime.utcnow().isoformat()
        
        # Save to file
        if save_demo_campaigns(_demo_campaigns, _demo_adsets):
            logger.info("Campaign updated saved to storage")
        else:
            logger.warning("Failed to save campaign update to storage")
        
        return {
            "status": "success",
            "message": "Kampagne erfolgreich aktualisiert (Demo)",
            "data": campaign
        }
    
    try:
        # Optimistic locking: Check version if provided
        if request.version is not None:
            # Use atomic update with version check to prevent race conditions
            update_data = {
                "updated_at": datetime.utcnow(),
                "version": request.version + 1
            }
            if request.name:
                update_data["name"] = request.name
            if request.status:
                update_data["status"] = request.status
            if request.objective:
                update_data["objective"] = request.objective
            
            result = await Campaign.find_one(
                {"_id": campaign_id, "version": request.version}
            ).update({"$set": update_data})
            
            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Kampagne wurde inzwischen geändert. Bitte aktualisieren und erneut versuchen."
                )
        else:
            # Fallback to non-atomic update if no version provided
            campaign = await Campaign.get(campaign_id)
            if not campaign:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Kampagne mit ID {campaign_id} nicht gefunden"
                )
            
            # Update fields
            if request.name:
                campaign.name = request.name
            if request.status:
                campaign.status = request.status
            if request.objective:
                campaign.objective = request.objective
            
            campaign.updated_at = datetime.utcnow()
            campaign.version += 1  # Increment version
            
            await campaign.save()
        
        return {
            "status": "success",
            "message": "Kampagne erfolgreich aktualisiert",
            "data": {
                "id": campaign.id,
                "name": campaign.name
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Aktualisieren der Kampagne: {str(e)}"
        )


@router.delete("/{campaign_id}", response_model=Dict[str, Any])
async def delete_campaign(
    campaign_id: str,
    current_user=Depends(get_current_user_or_demo),
    db=Depends(get_db)
):
    """
    Kampagne löschen (inkl. aller AdSets und Ads)
    
    Beispiel:
    ```
    DELETE /api/v1/campaigns/23853712345678901
    ```
    """
    # Demo mode
    if not DB_AVAILABLE:
        campaign = next((c for c in _demo_campaigns if c["id"] == campaign_id), None)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kampagne mit ID {campaign_id} nicht gefunden"
            )
        
        # Remove from demo campaigns
        _demo_campaigns[:] = [c for c in _demo_campaigns if c["id"] != campaign_id]
        
        # Remove associated adsets
        if campaign_id in _demo_adsets:
            del _demo_adsets[campaign_id]
        
        # Save to file
        if save_demo_campaigns(_demo_campaigns, _demo_adsets):
            logger.info("Campaign deletion saved to storage")
        else:
            logger.warning("Failed to save campaign deletion to storage")
        
        return {
            "status": "success",
            "message": "Kampagne und alle zugehörigen AdSets/Ads erfolgreich gelöscht (Demo)"
        }
    
    try:
        campaign = await Campaign.get(campaign_id)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kampagne mit ID {campaign_id} nicht gefunden"
            )
        
        # Delete campaign (AdSets and Ads will be automatically deleted via MongoDB relations)
        await campaign.delete()
        
        return {
            "status": "success",
            "message": "Kampagne und alle zugehörigen AdSets/Ads erfolgreich gelöscht"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Löschen der Kampagne: {str(e)}"
        )


# ============================================
# AdSet Endpoints
# ============================================

@router.get("/{campaign_id}/adsets", response_model=Dict[str, Any])
async def list_campaign_adsets(
    campaign_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db=Depends(get_db)
):
    """
    Alle AdSets einer spezifischen Kampagne
    
    Beispiel:
    ```
    GET /api/v1/campaigns/23853712345678901/adsets?skip=0&limit=10
    ```
    """
    try:
        # Check if campaign exists
        campaign = await Campaign.get(campaign_id)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kampagne mit ID {campaign_id} nicht gefunden"
            )
        
        # Get adsets
        query = {"campaign_id": campaign_id}
        adsets = await AdSet.find(query).skip(skip).limit(limit).to_list()
        total = await AdSet.find(query).count()
        
        # Enrich with ad counts
        response_items = []
        for adset in adsets:
            ads_count = await Ad.find({"ad_set_id": adset.id}).count()
            
            response_items.append(AdSetResponse(
                id=adset.id,
                campaign_id=adset.campaign_id,
                name=adset.name,
                status=adset.status,
                daily_budget=float(adset.daily_budget) if adset.daily_budget else None,
                lifetime_budget=float(adset.lifetime_budget) if adset.lifetime_budget else None,
                optimization_goal=adset.optimization_goal,
                billing_event=adset.billing_event,
                created_at=adset.created_at,
                updated_at=adset.updated_at,
                synced_at=adset.synced_at,
                ads_count=ads_count
            ))
        
        return {
            "status": "success",
            "campaign_id": campaign_id,
            "data": response_items,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + limit) < total
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Abrufen der AdSets: {str(e)}"
        )


@router.post("/{campaign_id}/adsets", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_adset(
    campaign_id: str,
    request: AdSetCreateRequest,
    db=Depends(get_db)
):
    """
    Neues AdSet für eine Kampagne erstellen
    
    Beispiel:
    ```
    POST /api/v1/campaigns/{campaign_id}/adsets
    {
        "name": "AdSet DE",
        "status": "ACTIVE",
        "daily_budget": 50.0,
        "optimization_goal": "CONVERSIONS",
        "billing_event": "IMPRESSIONS"
    }
    ```
    """
    # Demo mode - add to demo data
    print(f"[Campaigns API] create_adset: campaign_id={campaign_id}, DB_AVAILABLE={DB_AVAILABLE}, STORAGE_AVAILABLE={STORAGE_AVAILABLE}, is_db_available={is_db_available()}")
    if not is_db_available():
        if STORAGE_AVAILABLE:
            generated_id = uuid.uuid4().hex
            print(f"[Campaigns API] Creating adset with generated ID: {generated_id} for campaign {campaign_id}")
            new_adset = {
                "id": generated_id,
                "campaign_id": campaign_id,
                "name": request.name,
                "status": request.status,
                "daily_budget": request.daily_budget,
                "lifetime_budget": request.lifetime_budget,
                "optimization_goal": request.optimization_goal,
                "billing_event": request.billing_event,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "synced_at": None,
                "ads_count": 0
            }
            # Use storage service to add adset
            try:
                _demo_campaigns[:], _demo_adsets = add_adset(_demo_campaigns, _demo_adsets, new_adset)
                if save_demo_campaigns(_demo_campaigns, _demo_adsets):
                    logger.info("AdSet saved to storage")
                else:
                    logger.warning("Failed to save AdSet to storage")
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Demo: {str(e)}"
                )
            return {
                "status": "success",
                "message": "Demo: AdSet erstellt (Datenbank nicht verfügbar)",
                "data": new_adset
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not available and demo storage not available"
            )
    
    try:
        # Check if campaign exists
        campaign = await Campaign.get(campaign_id)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kampagne mit ID {campaign_id} nicht gefunden"
            )
        
        # Generate unique adset ID
        generated_id = uuid.uuid4().hex
        # Ensure ID is unique
        while await AdSet.get(generated_id) is not None:
            generated_id = uuid.uuid4().hex
        
        # Create adset
        adset = AdSet(
            id=generated_id,
            campaign_id=campaign_id,
            name=request.name,
            status=request.status,
            daily_budget=Decimal(request.daily_budget) if request.daily_budget else None,
            lifetime_budget=Decimal(request.lifetime_budget) if request.lifetime_budget else None,
            optimization_goal=request.optimization_goal,
            billing_event=request.billing_event,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        await adset.save()
        
        return {
            "status": "success",
            "message": "AdSet erfolgreich erstellt",
            "data": {
                "id": adset.id,
                "name": adset.name,
                "campaign_id": adset.campaign_id
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Erstellen des AdSets: {str(e)}"
        )


# ============================================
# Ad Endpoints
# ============================================

@router.get("/{campaign_id}/ads", response_model=Dict[str, Any])
async def list_campaign_ads(
    campaign_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db=Depends(get_db)
):
    """
    Alle Ads einer spezifischen Kampagne (über alle AdSets)
    
    Beispiel:
    ```
    GET /api/v1/campaigns/23853712345678901/ads?skip=0&limit=10
    ```
    """
    try:
        # Check if campaign exists
        campaign = await Campaign.get(campaign_id)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kampagne mit ID {campaign_id} nicht gefunden"
            )
        
        # Get adset IDs first
        adsets = await AdSet.find({"campaign_id": campaign_id}).to_list()
        adset_ids = [a.id for a in adsets]
        
        # Get ads
        query = {"ad_set_id": {"$in": adset_ids}}
        ads = await Ad.find(query).skip(skip).limit(limit).to_list()
        total = await Ad.find(query).count()
        
        response_items = [AdResponse(
            id=ad.id,
            ad_set_id=ad.ad_set_id,
            name=ad.name,
            status=ad.status,
            creative_type=ad.creative_type,
            image_url=ad.image_url,
            created_at=ad.created_at,
            updated_at=ad.updated_at,
            synced_at=ad.synced_at
        ) for ad in ads]
        
        return {
            "status": "success",
            "campaign_id": campaign_id,
            "data": response_items,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + limit) < total
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Abrufen der Ads: {str(e)}"
        )


@router.get("/{campaign_id}/hierarchy", response_model=Dict[str, Any])
async def get_campaign_hierarchy(
    campaign_id: str,
    db=Depends(get_db)
):
    """
    Komplette Hierarchie einer Kampagne: Campaign -> AdSets -> Ads
    
    Beispiel:
    ```
    GET /api/v1/campaigns/23853712345678901/hierarchy
    ```
    
    Response:
    ```json
    {
        "campaign": {...},
        "adsets": [
            {
                "adset": {...},
                "ads": [...]
            }
        ]
    }
    ```
    """
    try:
        # Get campaign
        campaign = await Campaign.get(campaign_id)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kampagne mit ID {campaign_id} nicht gefunden"
            )
        
        # Get adsets with their ads
        adsets = await AdSet.find({"campaign_id": campaign_id}).to_list()
        
        hierarchy = []
        for adset in adsets:
            ads = await Ad.find({"ad_set_id": adset.id}).to_list()
            
            hierarchy.append({
                "adset": AdSetResponse(
                    id=adset.id,
                    campaign_id=adset.campaign_id,
                    name=adset.name,
                    status=adset.status,
                    daily_budget=float(adset.daily_budget) if adset.daily_budget else None,
                    optimization_goal=adset.optimization_goal,
                    billing_event=adset.billing_event,
                    created_at=adset.created_at,
                    updated_at=adset.updated_at,
                    ads_count=len(ads)
                ),
                "ads": [AdResponse(
                    id=ad.id,
                    ad_set_id=ad.ad_set_id,
                    name=ad.name,
                    status=ad.status,
                    creative_type=ad.creative_type,
                    created_at=ad.created_at,
                    updated_at=ad.updated_at
                ) for ad in ads]
            })
        
        # Get metrics summary
        campaign_metrics = await Metric.find({
            "entity_type": "campaign",
            "entity_id": campaign_id
        }).to_list()
        
        total_spend = sum(float(m.spend) for m in campaign_metrics)
        total_revenue = sum(float(m.revenue) for m in campaign_metrics)
        total_impressions = sum(m.impressions for m in campaign_metrics)
        total_clicks = sum(m.clicks for m in campaign_metrics)
        total_conversions = sum(m.conversions for m in campaign_metrics)
        
        campaign_data = CampaignResponse(
            id=campaign.id,
            name=campaign.name,
            status=campaign.status,
            objective=campaign.objective,
            created_at=campaign.created_at,
            updated_at=campaign.updated_at,
            synced_at=campaign.synced_at,
            ad_sets_count=len(adsets),
            total_spend=total_spend,
            total_revenue=total_revenue
        )
        
        return {
            "status": "success",
            "data": {
                "campaign": campaign_data,
                "adsets": hierarchy,
                "metrics_summary": {
                    "total_impressions": total_impressions,
                    "total_clicks": total_clicks,
                    "total_conversions": total_conversions,
                    "total_spend": total_spend,
                    "total_revenue": total_revenue
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Abrufen der Hierarchie: {str(e)}"
        )