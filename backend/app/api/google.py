"""
Google Ads API Integration Endpoints
ETL Operationen für Google Ads Daten
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import date
from app.db.session import get_db
from app.services.google_ads_etl import GoogleAdsETL
from app.db.models_ads_config import AdPlatformConfig
import os

router = APIRouter(prefix="/google", tags=["Google Ads"])


async def get_google_ads_config() -> Dict[str, Any]:
    """
    Retrieve active Google Ads configuration from database or fallback to environment variables.
    Returns dict with keys: client_id, client_secret, refresh_token, developer_token, login_customer_id
    """
    config = await AdPlatformConfig.find_one({"platform": "google_ads", "is_active": True})
    if config:
        return {
            "client_id": config.google_client_id,
            "client_secret": config.google_client_secret,
            "refresh_token": config.google_refresh_token,
            "developer_token": config.google_developer_token,
            "login_customer_id": config.google_login_customer_id,
            "config_source": "database"
        }
    else:
        return {
            "client_id": os.getenv("GOOGLE_ADS_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_ADS_CLIENT_SECRET"),
            "refresh_token": os.getenv("GOOGLE_ADS_REFRESH_TOKEN"),
            "developer_token": os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN"),
            "login_customer_id": os.getenv("GOOGLE_ADS_LOGIN_CUSTOMER_ID"),
            "config_source": "environment"
        }


@router.post("/sync/campaigns")
async def sync_campaigns(
    background_tasks: BackgroundTasks,
    db=Depends(get_db)
):
    """
    Startet Sync von Google Ads Kampagnen
    Führt ETL Prozess für Kampagnen aus
    
    Beispiel:
    ```
    POST /api/v1/google/sync/campaigns
    ```
    
    Response:
    ```json
    {
        "status": "started",
        "message": "Campaign sync started in background",
        "mode": "mock"
    }
    ```
    """
    try:
        etl = GoogleAdsETL()
        config = await get_google_ads_config()
        await etl.initialize(
            client_id=config["client_id"],
            client_secret=config["client_secret"],
            refresh_token=config["refresh_token"],
            developer_token=config["developer_token"],
            login_customer_id=config["login_customer_id"]
        )
        
        # Führe Sync im Hintergrund aus
        background_tasks.add_task(etl.sync_campaigns)
        
        return {
            "status": "started",
            "message": "Google Ads Kampagnen-Sync im Hintergrund gestartet",
            "mode": etl.use_mock_data and "mock" or "real"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


@router.post("/sync/ad_groups")
async def sync_ad_groups(
    campaign_ids: Optional[List[str]] = None,
    background_tasks: BackgroundTasks = None,
    db=Depends(get_db)
):
    """
    Startet Sync von Google Ads AdGroups
    
    Args:
        campaign_ids: Optional Liste von Campaign IDs. Wenn nicht angegeben, werden alle geladen.
    
    Beispiel:
    ```
    POST /api/v1/google/sync/ad_groups
    {
        "campaign_ids": ["1234567890", "1234567891"]
    }
    ```
    """
    try:
        from app.db.models import Campaign
        
        etl = GoogleAdsETL()
        config = await get_google_ads_config()
        await etl.initialize(
            client_id=config["client_id"],
            client_secret=config["client_secret"],
            refresh_token=config["refresh_token"],
            developer_token=config["developer_token"],
            login_customer_id=config["login_customer_id"]
        )
        
        # Hole Campaign IDs falls nicht angegeben
        if not campaign_ids:
            campaigns = await Campaign.find().to_list()
            campaign_ids = [c.id for c in campaigns]
        
        # Führe Sync im Hintergrund aus
        background_tasks.add_task(etl.sync_ad_groups, campaign_ids)
        
        return {
            "status": "started",
            "message": f"AdGroup-Sync für {len(campaign_ids)} Kampagnen gestartet",
            "mode": etl.use_mock_data and "mock" or "real",
            "campaign_count": len(campaign_ids)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


@router.post("/sync/ads")
async def sync_ads(
    ad_group_ids: Optional[List[str]] = None,
    background_tasks: BackgroundTasks = None,
    db=Depends(get_db)
):
    """
    Startet Sync von Google Ads Ads
    
    Args:
        ad_group_ids: Optional Liste von AdGroup IDs. Wenn nicht angegeben, werden alle geladen.
    
    Beispiel:
    ```
    POST /api/v1/google/sync/ads
    {
        "ad_group_ids": ["1234567890_0", "1234567890_1"]
    }
    ```
    """
    try:
        from app.db.models import AdSet
        
        etl = GoogleAdsETL()
        config = await get_google_ads_config()
        await etl.initialize(
            client_id=config["client_id"],
            client_secret=config["client_secret"],
            refresh_token=config["refresh_token"],
            developer_token=config["developer_token"],
            login_customer_id=config["login_customer_id"]
        )
        
        # Hole AdGroup IDs falls nicht angegeben
        if not ad_group_ids:
            # Hier sollten wir Google Ads spezifische AdGroups holen, aber wir verwenden erstmal AdSets als Platzhalter
            ad_sets = await AdSet.find().to_list()
            ad_group_ids = [ad_set.id for ad_set in ad_sets]
        
        # Führe Sync im Hintergrund aus
        background_tasks.add_task(etl.sync_ads, ad_group_ids)
        
        return {
            "status": "started",
            "message": f"Ad-Sync für {len(ad_group_ids)} AdGroups gestartet",
            "mode": etl.use_mock_data and "mock" or "real",
            "ad_group_count": len(ad_group_ids)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


@router.post("/sync/metrics")
async def sync_metrics(
    entity_type: str,
    entity_ids: Optional[List[str]] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    background_tasks: BackgroundTasks = None,
    db=Depends(get_db)
):
    """
    Startet Sync von Google Ads Metriken
    
    Args:
        entity_type: 'campaign', 'ad_group', oder 'ad'
        entity_ids: Optional Liste von Entity IDs
        start_date: Start Datum (default: vor 30 Tagen)
        end_date: End Datum (default: heute)
    
    Beispiel:
    ```
    POST /api/v1/google/sync/metrics
    {
        "entity_type": "campaign",
        "entity_ids": ["1234567890"],
        "start_date": "2025-01-01",
        "end_date": "2025-01-31"
    }
    ```
    """
    try:
        from datetime import date, timedelta
        
        etl = GoogleAdsETL()
        client_id = os.getenv("GOOGLE_ADS_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_ADS_CLIENT_SECRET")
        refresh_token = os.getenv("GOOGLE_ADS_REFRESH_TOKEN")
        developer_token = os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN")
        login_customer_id = os.getenv("GOOGLE_ADS_LOGIN_CUSTOMER_ID")
        
        await etl.initialize(
            client_id=client_id,
            client_secret=client_secret,
            refresh_token=refresh_token,
            developer_token=developer_token,
            login_customer_id=login_customer_id
        )
        
        # Default Werte
        if start_date is None:
            start_date = date.today() - timedelta(days=30)
        if end_date is None:
            end_date = date.today()
        
        # Hole Entity IDs falls nicht angegeben
        if not entity_ids:
            if entity_type == "campaign":
                from app.db.models import Campaign
                entities = await Campaign.find().to_list()
                entity_ids = [c.id for c in entities]
            elif entity_type == "ad_group":
                from app.db.models import AdSet
                entities = await AdSet.find().to_list()
                entity_ids = [a.id for a in entities]
            elif entity_type == "ad":
                from app.db.models import Ad
                entities = await Ad.find().to_list()
                entity_ids = [a.id for a in entities]
            else:
                raise HTTPException(status_code=400, detail="Ungültiger entity_type")
        
        # Führe Sync im Hintergrund aus
        background_tasks.add_task(etl.sync_metrics, entity_type, entity_ids, start_date, end_date)
        
        return {
            "status": "started",
            "message": f"Metriken-Sync für {len(entity_ids)} {entity_type}s gestartet",
            "mode": etl.use_mock_data and "mock" or "real",
            "entity_count": len(entity_ids),
            "date_range": f"{start_date} bis {end_date}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


@router.get("/reports")
async def get_reports(
    campaign_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 100,
    db=Depends(get_db)
):
    """
    Holt gespeicherte Google Ads Reports
    
    Args:
        campaign_id: Optional Campaign ID zum Filtern
        start_date: Optional Start Datum
        end_date: Optional End Datum
        limit: Maximale Anzahl an Reports (default: 100)
    
    Beispiel:
    ```
    GET /api/v1/google/reports?campaign_id=1234567890&start_date=2025-01-01&end_date=2025-01-31
    ```
    """
    try:
        from app.db.models import GoogleAdsReport
        from datetime import date, timedelta
        
        query = {}
        
        if campaign_id:
            query["campaign_id"] = campaign_id
        
        if start_date is None:
            start_date = date.today() - timedelta(days=30)
        if end_date is None:
            end_date = date.today()
        
        query["segments_date"] = {"$gte": start_date, "$lte": end_date}
        
        reports = await GoogleAdsReport.find(
            query,
            limit=limit,
            sort=[("segments_date", -1)]
        ).to_list()
        
        return {
            "status": "success",
            "data": reports,
            "count": len(reports),
            "date_range": f"{start_date} bis {end_date}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


@router.get("/status")
async def get_google_ads_status(db=Depends(get_db)):
    """
    Gibt Status der Google Ads API Konfiguration zurück
    
    Prüft zuerst aktive Datenbankkonfiguration, fallback auf Umgebungsvariablen.
    
    Beispiel:
    ```
    GET /api/v1/google/status
    ```
    
    Response:
    ```json
    {
        "status": "configured",
        "mode": "mock",  // oder "real"
        "login_customer_id": "1234567890",
        "has_credentials": true,
        "config_source": "database", // oder "environment"
        "entities": {
            "campaigns": 3,
            "ad_groups": 6,
            "ads": 12
        }
    }
    ```
    """
    try:
        from app.db.models import Campaign, AdSet, Ad
        
        # Check database for active google_ads config
        config = await AdPlatformConfig.find_one({"platform": "google_ads", "is_active": True})
        config_source = "database" if config else "environment"
        
        if config:
            client_id = config.google_client_id
            client_secret = config.google_client_secret
            refresh_token = config.google_refresh_token
            developer_token = config.google_developer_token
            login_customer_id = config.google_login_customer_id
        else:
            # Fallback to environment variables
            client_id = os.getenv("GOOGLE_ADS_CLIENT_ID")
            client_secret = os.getenv("GOOGLE_ADS_CLIENT_SECRET")
            refresh_token = os.getenv("GOOGLE_ADS_REFRESH_TOKEN")
            developer_token = os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN")
            login_customer_id = os.getenv("GOOGLE_ADS_LOGIN_CUSTOMER_ID")
        
        # Zähle Entities (generische Campaigns/AdSets/Ads, die von Google Ads stammen könnten)
        campaign_count = await Campaign.count()
        adset_count = await AdSet.count()
        ad_count = await Ad.count()
        
        # Determine mode: real if all required credentials are present and not dummy values
        has_valid_credentials = bool(client_id) and client_id.strip() != "" and \
                                bool(client_secret) and client_secret.strip() != "" and \
                                bool(refresh_token) and refresh_token.strip() != "" and \
                                bool(developer_token) and developer_token.strip() != ""
        mode = "real" if has_valid_credentials else "mock"
        
        status = "configured" if has_valid_credentials else "not_configured"
        
        return {
            "status": status,
            "mode": mode,
            "login_customer_id": login_customer_id,
            "has_credentials": has_valid_credentials,
            "config_source": config_source,
            "entities": {
                "campaigns": campaign_count,
                "ad_groups": adset_count,
                "ads": ad_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")