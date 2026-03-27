"""
Marketing Kampagnen API
CRUD Endpoints für Campaigns, AdSets, Ads — DB only
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
import logging
import uuid

from app.db.session import get_db
from app.db.models import Campaign, AdSet, Ad, Metric, User
from app.core.auth import get_current_active_user

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])
logger = logging.getLogger(__name__)


# ============================================
# Request/Response Models
# ============================================

class CampaignCreateRequest(BaseModel):
    name: str
    status: str = "ACTIVE"
    objective: Optional[str] = None

    class Config:
        extra = "forbid"


class CampaignUpdateRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    objective: Optional[str] = None
    version: Optional[int] = None  # For optimistic locking


class AdSetCreateRequest(BaseModel):
    name: str
    status: str = "ACTIVE"
    daily_budget: Optional[float] = None
    lifetime_budget: Optional[float] = None
    optimization_goal: Optional[str] = None
    billing_event: Optional[str] = None

    class Config:
        extra = "forbid"


class CampaignResponse(BaseModel):
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
        json_encoders = {Decimal: float}


class AdSetResponse(BaseModel):
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
        json_encoders = {Decimal: float}


class AdResponse(BaseModel):
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
        json_encoders = {Decimal: float}


# ============================================
# Helper
# ============================================

async def _get_campaign_or_404(campaign_id: str) -> Campaign:
    campaign = await Campaign.get(campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kampagne mit ID {campaign_id} nicht gefunden",
        )
    return campaign


async def _campaign_metrics(campaign_id: str) -> tuple[float, float]:
    metrics = await Metric.find(
        {"entity_type": "campaign", "entity_id": campaign_id}
    ).to_list()
    spend = sum(float(m.spend) for m in metrics)
    revenue = sum(float(m.revenue) for m in metrics)
    return spend, revenue


# ============================================
# Campaign Endpoints
# ============================================

@router.get("", response_model=Dict[str, Any])
async def list_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    try:
        query = {}
        if status:
            query["status"] = status

        campaigns = await Campaign.find(query).skip(skip).limit(limit).to_list()
        total = await Campaign.find(query).count()

        response_items = []
        for c in campaigns:
            ad_sets_count = await AdSet.find({"campaign_id": c.id}).count()
            spend, revenue = await _campaign_metrics(c.id)
            response_items.append(CampaignResponse(
                id=c.id,
                name=c.name,
                status=c.status,
                objective=c.objective,
                created_at=c.created_at,
                updated_at=c.updated_at,
                synced_at=c.synced_at,
                ad_sets_count=ad_sets_count,
                total_spend=spend,
                total_revenue=revenue,
            ))

        return {
            "status": "success",
            "data": response_items,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + limit) < total,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("list_campaigns failed")
        raise HTTPException(status_code=500, detail=f"Fehler beim Laden der Kampagnen: {e}")


@router.get("/{campaign_id}", response_model=Dict[str, Any])
async def get_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    try:
        campaign = await _get_campaign_or_404(campaign_id)
        ad_sets_count = await AdSet.find({"campaign_id": campaign_id}).count()
        spend, revenue = await _campaign_metrics(campaign_id)

        return {
            "status": "success",
            "data": CampaignResponse(
                id=campaign.id,
                name=campaign.name,
                status=campaign.status,
                objective=campaign.objective,
                created_at=campaign.created_at,
                updated_at=campaign.updated_at,
                synced_at=campaign.synced_at,
                ad_sets_count=ad_sets_count,
                total_spend=spend,
                total_revenue=revenue,
            ),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("get_campaign failed")
        raise HTTPException(status_code=500, detail=f"Fehler beim Abrufen der Kampagne: {e}")


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_campaign(
    request: CampaignCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    try:
        generated_id = uuid.uuid4().hex
        while await Campaign.get(generated_id) is not None:
            generated_id = uuid.uuid4().hex

        campaign = Campaign(
            id=generated_id,
            name=request.name,
            status=request.status,
            objective=request.objective,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await campaign.save()

        return {
            "status": "success",
            "message": "Kampagne erfolgreich erstellt",
            "data": {"id": campaign.id, "name": campaign.name},
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("create_campaign failed")
        raise HTTPException(status_code=500, detail=f"Fehler beim Erstellen der Kampagne: {e}")


@router.put("/{campaign_id}", response_model=Dict[str, Any])
async def update_campaign(
    campaign_id: str,
    request: CampaignUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    try:
        if request.version is not None:
            update_data: Dict[str, Any] = {
                "updated_at": datetime.utcnow(),
                "version": request.version + 1,
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
                    detail="Kampagne wurde inzwischen geändert. Bitte aktualisieren und erneut versuchen.",
                )
            campaign = await _get_campaign_or_404(campaign_id)
        else:
            campaign = await _get_campaign_or_404(campaign_id)
            if request.name:
                campaign.name = request.name
            if request.status:
                campaign.status = request.status
            if request.objective:
                campaign.objective = request.objective
            campaign.updated_at = datetime.utcnow()
            campaign.version = getattr(campaign, "version", 0) + 1
            await campaign.save()

        return {
            "status": "success",
            "message": "Kampagne erfolgreich aktualisiert",
            "data": {"id": campaign.id, "name": campaign.name},
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("update_campaign failed")
        raise HTTPException(status_code=500, detail=f"Fehler beim Aktualisieren der Kampagne: {e}")


@router.delete("/{campaign_id}", response_model=Dict[str, Any])
async def delete_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    try:
        campaign = await _get_campaign_or_404(campaign_id)
        await campaign.delete()
        return {
            "status": "success",
            "message": "Kampagne und alle zugehörigen AdSets/Ads erfolgreich gelöscht",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("delete_campaign failed")
        raise HTTPException(status_code=500, detail=f"Fehler beim Löschen der Kampagne: {e}")


# ============================================
# AdSet Endpoints
# ============================================

@router.get("/{campaign_id}/adsets", response_model=Dict[str, Any])
async def list_campaign_adsets(
    campaign_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    try:
        await _get_campaign_or_404(campaign_id)

        query = {"campaign_id": campaign_id}
        adsets = await AdSet.find(query).skip(skip).limit(limit).to_list()
        total = await AdSet.find(query).count()

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
                ads_count=ads_count,
            ))

        return {
            "status": "success",
            "campaign_id": campaign_id,
            "data": response_items,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + limit) < total,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("list_campaign_adsets failed")
        raise HTTPException(status_code=500, detail=f"Fehler beim Abrufen der AdSets: {e}")


@router.post("/{campaign_id}/adsets", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_adset(
    campaign_id: str,
    request: AdSetCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    try:
        await _get_campaign_or_404(campaign_id)

        generated_id = uuid.uuid4().hex
        while await AdSet.get(generated_id) is not None:
            generated_id = uuid.uuid4().hex

        adset = AdSet(
            id=generated_id,
            campaign_id=campaign_id,
            name=request.name,
            status=request.status,
            daily_budget=Decimal(str(request.daily_budget)) if request.daily_budget else None,
            lifetime_budget=Decimal(str(request.lifetime_budget)) if request.lifetime_budget else None,
            optimization_goal=request.optimization_goal,
            billing_event=request.billing_event,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await adset.save()

        return {
            "status": "success",
            "message": "AdSet erfolgreich erstellt",
            "data": {"id": adset.id, "name": adset.name, "campaign_id": adset.campaign_id},
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("create_adset failed")
        raise HTTPException(status_code=500, detail=f"Fehler beim Erstellen des AdSets: {e}")


# ============================================
# Ad Endpoints
# ============================================

@router.get("/{campaign_id}/ads", response_model=Dict[str, Any])
async def list_campaign_ads(
    campaign_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    try:
        await _get_campaign_or_404(campaign_id)

        adsets = await AdSet.find({"campaign_id": campaign_id}).to_list()
        adset_ids = [a.id for a in adsets]

        query = {"ad_set_id": {"$in": adset_ids}}
        ads = await Ad.find(query).skip(skip).limit(limit).to_list()
        total = await Ad.find(query).count()

        response_items = [
            AdResponse(
                id=ad.id,
                ad_set_id=ad.ad_set_id,
                name=ad.name,
                status=ad.status,
                creative_type=ad.creative_type,
                image_url=ad.image_url,
                created_at=ad.created_at,
                updated_at=ad.updated_at,
                synced_at=ad.synced_at,
            )
            for ad in ads
        ]

        return {
            "status": "success",
            "campaign_id": campaign_id,
            "data": response_items,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + limit) < total,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("list_campaign_ads failed")
        raise HTTPException(status_code=500, detail=f"Fehler beim Abrufen der Ads: {e}")


# ============================================
# Hierarchy Endpoint
# ============================================

@router.get("/{campaign_id}/hierarchy", response_model=Dict[str, Any])
async def get_campaign_hierarchy(
    campaign_id: str,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    try:
        campaign = await _get_campaign_or_404(campaign_id)
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
                    lifetime_budget=float(adset.lifetime_budget) if adset.lifetime_budget else None,
                    optimization_goal=adset.optimization_goal,
                    billing_event=adset.billing_event,
                    created_at=adset.created_at,
                    updated_at=adset.updated_at,
                    ads_count=len(ads),
                ),
                "ads": [
                    AdResponse(
                        id=ad.id,
                        ad_set_id=ad.ad_set_id,
                        name=ad.name,
                        status=ad.status,
                        creative_type=ad.creative_type,
                        created_at=ad.created_at,
                        updated_at=ad.updated_at,
                    )
                    for ad in ads
                ],
            })

        spend, revenue = await _campaign_metrics(campaign_id)
        metrics = await Metric.find(
            {"entity_type": "campaign", "entity_id": campaign_id}
        ).to_list()

        return {
            "status": "success",
            "data": {
                "campaign": CampaignResponse(
                    id=campaign.id,
                    name=campaign.name,
                    status=campaign.status,
                    objective=campaign.objective,
                    created_at=campaign.created_at,
                    updated_at=campaign.updated_at,
                    synced_at=campaign.synced_at,
                    ad_sets_count=len(adsets),
                    total_spend=spend,
                    total_revenue=revenue,
                ),
                "adsets": hierarchy,
                "metrics_summary": {
                    "total_impressions": sum(m.impressions for m in metrics),
                    "total_clicks": sum(m.clicks for m in metrics),
                    "total_conversions": sum(m.conversions for m in metrics),
                    "total_spend": spend,
                    "total_revenue": revenue,
                },
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("get_campaign_hierarchy failed")
        raise HTTPException(status_code=500, detail=f"Fehler beim Abrufen der Hierarchie: {e}")