"""
Meta Ads API Integration Endpoints
Phase 2: I-03 - Meta Ads API Integration API
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
from datetime import date
from app.db.session import get_db
from app.services.meta_ads_etl import MetaAdsETL
import os

router = APIRouter(prefix="/meta", tags=["Meta Ads"])


@router.post("/sync/campaigns")
async def sync_campaigns(
    background_tasks: BackgroundTasks,
    db=Depends(get_db)
):
    """
    Startet Sync von Meta Ads Kampagnen
    Führt ETL Prozess für Kampagnen aus
    
    Beispiel:
    ```
    POST /api/v1/meta/sync/campaigns
    ```
    
    Response:
    ```json
    {
        "status": "started",
        "message": "Campaign sync started in background"
    }
    ```
    """
    try:
        etl = MetaAdsETL()
        access_token = os.getenv("META_ACCESS_TOKEN")
        app_id = os.getenv("META_APP_ID")
        ad_account_id = os.getenv("META_AD_ACCOUNT_ID")
        
        await etl.initialize(access_token, app_id, ad_account_id)
        
        # Führe Sync im Hintergrund aus
        background_tasks.add_task(etl.sync_campaigns)
        
        return {
            "status": "started",
            "message": "Kampagnen-Sync im Hintergrund gestartet",
            "mode": etl.use_mock_data and "mock" or "real"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


@router.post("/sync/adsets")
async def sync_adsets(
    campaign_ids: Optional[List[str]] = None,
    background_tasks: BackgroundTasks = None,
    db=Depends(get_db)
):
    """
    Startet Sync von Meta Ads AdSets
    
    Args:
        campaign_ids: Optional Liste von Campaign IDs. Wenn nicht angegeben, werden alle geladen.
    
    Beispiel:
    ```
    POST /api/v1/meta/sync/adsets
    {
        "campaign_ids": ["23853712345678901", "23853712345678902"]
    }
    ```
    """
    try:
        from app.db.models import Campaign
        
        etl = MetaAdsETL()
        access_token = os.getenv("META_ACCESS_TOKEN")
        app_id = os.getenv("META_APP_ID")
        ad_account_id = os.getenv("META_AD_ACCOUNT_ID")
        
        await etl.initialize(access_token, app_id, ad_account_id)
        
        # Hole Campaign IDs falls nicht angegeben
        if not campaign_ids:
            campaigns = await Campaign.find().to_list()
            campaign_ids = [c.id for c in campaigns]
        
        # Führe Sync im Hintergrund aus
        background_tasks.add_task(etl.sync_adsets, campaign_ids)
        
        return {
            "status": "started",
            "message": f"AdSet-Sync für {len(campaign_ids)} Kampagnen gestartet",
            "mode": etl.use_mock_data and "mock" or "real",
            "campaign_count": len(campaign_ids)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


@router.post("/sync/ads")
async def sync_ads(
    adset_ids: Optional[List[str]] = None,
    background_tasks: BackgroundTasks = None,
    db=Depends(get_db)
):
    """
    Startet Sync von Meta Ads Ads
    
    Args:
        adset_ids: Optional Liste von AdSet IDs. Wenn nicht angegeben, werden alle geladen.
    
    Beispiel:
    ```
    POST /api/v1/meta/sync/ads
    {
        "adset_ids": ["adset_123", "adset_456"]
    }
    ```
    """
    try:
        from app.db.models import AdSet
        
        etl = MetaAdsETL()
        access_token = os.getenv("META_ACCESS_TOKEN")
        app_id = os.getenv("META_APP_ID")
        ad_account_id = os.getenv("META_AD_ACCOUNT_ID")
        
        await etl.initialize(access_token, app_id, ad_account_id)
        
        # Hole AdSet IDs falls nicht angegeben
        if not adset_ids:
            adsets = await AdSet.find().to_list()
            adset_ids = [a.id for a in adsets]
        
        # Führe Sync im Hintergrund aus
        background_tasks.add_task(etl.sync_ads, adset_ids)
        
        return {
            "status": "started",
            "message": f"Ad-Sync für {len(adset_ids)} AdSets gestartet",
            "mode": etl.use_mock_data and "mock" or "real",
            "adset_count": len(adset_ids)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


@router.post("/sync/insights")
async def sync_insights(
    entity_type: str,
    entity_ids: List[str],
    start_date: date,
    end_date: date,
    background_tasks: BackgroundTasks = None,
    db=Depends(get_db)
):
    """
    Startet Sync von Meta Ads Insights (Performance-Daten)
    
    Args:
        entity_type: 'campaign', 'adset', oder 'ad'
        entity_ids: Liste von Entity IDs
        start_date: Start Datum
        end_date: End Datum
    
    Beispiel:
    ```
    POST /api/v1/meta/sync/insights
    {
        "entity_type": "campaign",
        "entity_ids": ["23853712345678901"],
        "start_date": "2025-01-01",
        "end_date": "2025-01-31"
    }
    ```
    """
    try:
        etl = MetaAdsETL()
        access_token = os.getenv("META_ACCESS_TOKEN")
        app_id = os.getenv("META_APP_ID")
        ad_account_id = os.getenv("META_AD_ACCOUNT_ID")
        
        await etl.initialize(access_token, app_id, ad_account_id)
        
        # Führe Sync im Hintergrund aus
        background_tasks.add_task(etl.sync_insights, entity_type, entity_ids, start_date, end_date)
        
        return {
            "status": "started",
            "message": f"Insights-Sync für {len(entity_ids)} {entity_type}s gestartet",
            "mode": etl.use_mock_data and "mock" or "real",
            "entity_type": entity_type,
            "entity_count": len(entity_ids),
            "period": f"{start_date} bis {end_date}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


@router.post("/sync/all")
async def sync_all(
    background_tasks: BackgroundTasks = None,
    db=Depends(get_db)
):
    """
    Führt vollständigen Sync aller Meta Ads Daten aus
    (Kampagnen, AdSets, Ads, Insights für letzte 30 Tage)
    
    Beispiel:
    ```
    POST /api/v1/meta/sync/all
    ```
    
    Response:
    ```json
    {
        "status": "started",
        "message": "Vollständiger Sync im Hintergrund gestartet",
        "steps": ["campaigns", "adsets", "ads", "insights"]
    }
    ```
    """
    try:
        async def run_full_sync():
            """Führt vollständigen Sync im Hintergrund aus"""
            from datetime import date, timedelta
            from app.db.models import Campaign, AdSet, Ad
            
            etl = MetaAdsETL()
            access_token = os.getenv("META_ACCESS_TOKEN")
            app_id = os.getenv("META_APP_ID")
            ad_account_id = os.getenv("META_AD_ACCOUNT_ID")
            
            await etl.initialize(access_token, app_id, ad_account_id)
            
            # 1. Sync Kampagnen
            print("🔄 Sync Kampagnen...")
            await etl.sync_campaigns()
            
            # 2. Sync AdSets
            campaigns = await Campaign.find().to_list()
            campaign_ids = [c.id for c in campaigns]
            print("🔄 Sync AdSets...")
            await etl.sync_adsets(campaign_ids)
            
            # 3. Sync Ads
            adsets = await AdSet.find().to_list()
            adset_ids = [a.id for a in adsets]
            print("🔄 Sync Ads...")
            await etl.sync_ads(adset_ids)
            
            # 4. Sync Insights (letzte 30 Tage)
            end_date = date.today()
            start_date = end_date - timedelta(days=30)
            ads = await Ad.find().to_list()
            ad_ids = [a.id for a in ads]
            
            print("🔄 Sync Campaign Insights...")
            await etl.sync_insights("campaign", campaign_ids, start_date, end_date)
            
            print("🔄 Sync AdSet Insights...")
            await etl.sync_insights("adset", adset_ids, start_date, end_date)
            
            print("🔄 Sync Ad Insights...")
            await etl.sync_insights("ad", ad_ids, start_date, end_date)
            
            print("✅ Vollständiger Sync abgeschlossen!")
        
        # Starte im Hintergrund
        background_tasks.add_task(run_full_sync)
        
        return {
            "status": "started",
            "message": "Vollständiger Sync im Hintergrund gestartet",
            "mode": "mock",
            "steps": ["campaigns", "adsets", "ads", "insights"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


@router.get("/status")
async def get_meta_api_status(db=Depends(get_db)):
    """
    Gibt Status der Meta Ads API Konfiguration zurück
    
    Beispiel:
    ```
    GET /api/v1/meta/status
    ```
    
    Response:
    ```json
    {
        "status": "configured",
        "mode": "mock",  // oder "real"
        "account_id": "act_12345678",
        "has_access_token": true,
        "entities": {
            "campaigns": 3,
            "adsets": 6,
            "ads": 12
        }
    }
    ```
    """
    try:
        from app.db.models import Campaign, AdSet, Ad
        
        access_token = os.getenv("META_ACCESS_TOKEN")
        account_id = os.getenv("META_AD_ACCOUNT_ID")
        
        # Zähle Entities
        campaign_count = await Campaign.count()
        adset_count = await AdSet.count()
        ad_count = await Ad.count()
        
        # Erkenne Modus
        mode = "real" if access_token and access_token != "your_meta_access_token_here" else "mock"
        
        return {
            "status": "configured" if access_token else "not_configured",
            "mode": mode,
            "account_id": account_id,
            "has_access_token": bool(access_token) and access_token != "your_meta_access_token_here",
            "entities": {
                "campaigns": campaign_count,
                "adsets": adset_count,
                "ads": ad_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")