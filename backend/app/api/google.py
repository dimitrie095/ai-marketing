"""
Google Ads API Integration Endpoints
ETL Operationen für Google Ads Daten
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
from datetime import date
from app.db.session import get_db
from app.services.google_ads_etl import GoogleAdsETL
import os

router = APIRouter(prefix="/google", tags=["Google Ads"])


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