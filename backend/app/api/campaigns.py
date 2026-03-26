"""
Marketing Kampagnen API
Phase 2: B-04 - CRUD Endpoints für Campaigns, AdSets, Ads
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

# Try to import database dependencies
try:
    from app.db.session import get_db
    from app.db.models import Campaign, AdSet, Ad, Metric
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False
    get_db = lambda: None

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

# Demo data for when database is not available
_demo_campaigns = [
    {
        "id": "camp_1",
        "name": "Q1 2025 Konversionskampagne",
        "status": "ACTIVE",
        "objective": "CONVERSIONS",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-15T00:00:00Z",
        "synced_at": None,
        "ad_sets_count": 3,
        "total_spend": 2540.50,
        "total_revenue": 6780.00
    },
    {
        "id": "camp_2",
        "name": "Brand Awareness Kampagne",
        "status": "PAUSED",
        "objective": "REACH",
        "created_at": "2025-01-15T00:00:00Z",
        "updated_at": "2025-01-20T00:00:00Z",
        "synced_at": None,
        "ad_sets_count": 2,
        "total_spend": 1200.00,
        "total_revenue": 2340.00
    },
    {
        "id": "camp_3",
        "name": "Sommer Sale 2025",
        "status": "ACTIVE",
        "objective": "CONVERSIONS",
        "created_at": "2025-02-01T00:00:00Z",
        "updated_at": "2025-02-10T00:00:00Z",
        "synced_at": None,
        "ad_sets_count": 4,
        "total_spend": 3890.75,
        "total_revenue": 9450.00
    }
]

_demo_adsets = {
    "camp_1": [
        {"id": "as_1_1", "campaign_id": "camp_1", "name": "AdSet 1 - DE", "status": "ACTIVE", "daily_budget": 50.0, "optimization_goal": "CONVERSIONS", "billing_event": "IMPRESSIONS", "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-10T00:00:00Z", "ads_count": 2},
        {"id": "as_1_2", "campaign_id": "camp_1", "name": "AdSet 2 - AT", "status": "ACTIVE", "daily_budget": 30.0, "optimization_goal": "CONVERSIONS", "billing_event": "IMPRESSIONS", "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-10T00:00:00Z", "ads_count": 1},
        {"id": "as_1_3", "campaign_id": "camp_1", "name": "AdSet 3 - CH", "status": "PAUSED", "daily_budget": 20.0, "optimization_goal": "CONVERSIONS", "billing_event": "IMPRESSIONS", "created_at": "2025-01-05T00:00:00Z", "updated_at": "2025-01-15T00:00:00Z", "ads_count": 1},
    ],
    "camp_2": [
        {"id": "as_2_1", "campaign_id": "camp_2", "name": "AdSet 1 - Reach DE", "status": "ACTIVE", "daily_budget": 40.0, "optimization_goal": "REACH", "billing_event": "IMPRESSIONS", "created_at": "2025-01-15T00:00:00Z", "updated_at": "2025-01-20T00:00:00Z", "ads_count": 1},
        {"id": "as_2_2", "campaign_id": "camp_2", "name": "AdSet 2 - Reach AT", "status": "PAUSED", "daily_budget": 25.0, "optimization_goal": "REACH", "billing_event": "IMPRESSIONS", "created_at": "2025-01-15T00:00:00Z", "updated_at": "2025-01-18T00:00:00Z", "ads_count": 1},
    ],
    "camp_3": [
        {"id": "as_3_1", "campaign_id": "camp_3", "name": "AdSet 1 - Early Birds", "status": "ACTIVE", "daily_budget": 60.0, "optimization_goal": "CONVERSIONS", "billing_event": "IMPRESSIONS", "created_at": "2025-02-01T00:00:00Z", "updated_at": "2025-02-10T00:00:00Z", "ads_count": 2},
        {"id": "as_3_2", "campaign_id": "camp_3", "name": "AdSet 2 - Main Sale", "status": "ACTIVE", "daily_budget": 80.0, "optimization_goal": "CONVERSIONS", "billing_event": "IMPRESSIONS", "created_at": "2025-02-01T00:00:00Z", "updated_at": "2025-02-10T00:00:00Z", "ads_count": 2},
    ]
}

_demo_ads = {
    "as_1_1": [
        {"id": "ad_1_1_1", "ad_set_id": "as_1_1", "name": "Ad 1 - Carousel", "status": "ACTIVE", "creative_type": "CAROUSEL", "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-05T00:00:00Z"},
        {"id": "ad_1_1_2", "ad_set_id": "as_1_1", "name": "Ad 2 - Single Image", "status": "ACTIVE", "creative_type": "IMAGE", "created_at": "2025-01-02T00:00:00Z", "updated_at": "2025-01-06T00:00:00Z"},
    ],
    "as_1_2": [
        {"id": "ad_1_2_1", "ad_set_id": "as_1_2", "name": "Ad 1 - Video", "status": "ACTIVE", "creative_type": "VIDEO", "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-08T00:00:00Z"},
    ],
}


# ============================================
# Request/Response Models
# ============================================

class CampaignCreateRequest(BaseModel):
    """Request Model für Campaign Creation"""
    id: str
    name: str
    status: str = "ACTIVE"
    objective: Optional[str] = None


class CampaignUpdateRequest(BaseModel):
    """Request Model für Campaign Updates"""
    name: Optional[str] = None
    status: Optional[str] = None
    objective: Optional[str] = None


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
    if not DB_AVAILABLE:
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
    if not DB_AVAILABLE:
        campaign = next((c for c in _demo_campaigns if c["id"] == campaign_id), None)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kampagne mit ID {campaign_id} nicht gefunden"
            )
        return {
            "status": "success",
            "message": "Demo-Daten (Datenbank nicht verfügbar)",
            "data": campaign
        }
    
    try:
        campaign = await Campaign.find_one({"id": campaign_id})
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
    db=Depends(get_db)
):
    """
    Neue Kampagne erstellen
    
    Beispiel:
    ```
    POST /api/v1/campaigns
    {
        "id": "23853712345678910",
        "name": "Neue Kampagne Q2 2025",
        "status": "ACTIVE",
        "objective": "CONVERSIONS"
    }
    ```
    """
    # Demo mode - just return success
    if not DB_AVAILABLE:
        return {
            "status": "success",
            "message": "Demo: Kampagne erstellt (Datenbank nicht verfügbar)",
            "data": {
                "id": request.id,
                "name": request.name,
                "status": request.status,
                "objective": request.objective,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
        }
    
    try:
        # Check if campaign already exists
        existing = await Campaign.find_one({"id": request.id})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kampagne mit ID {request.id} existiert bereits"
            )
        
        # Create campaign
        campaign = Campaign(
            id=request.id,
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
    try:
        campaign = await Campaign.find_one({"id": campaign_id})
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
    db=Depends(get_db)
):
    """
    Kampagne löschen (inkl. aller AdSets und Ads)
    
    Beispiel:
    ```
    DELETE /api/v1/campaigns/23853712345678901
    ```
    """
    try:
        campaign = await Campaign.find_one({"id": campaign_id})
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
        campaign = await Campaign.find_one({"id": campaign_id})
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
        campaign = await Campaign.find_one({"id": campaign_id})
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
        campaign = await Campaign.find_one({"id": campaign_id})
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