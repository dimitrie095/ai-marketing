"""
KPI Analytics API Endpoints
Phase 2: i-02 - Core Features & KPI Engine
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import date, datetime
from app.db.session import get_db
from app.services.kpi_service import KPIService

router = APIRouter(prefix="/kpi", tags=["KPI"])


@router.get("/entity")
async def get_entity_kpis(
    entity_type: str = Query(..., regex="^(campaign|adset|ad)$", description="Entity Typ"),
    entity_id: str = Query(..., description="Entity ID"),
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    db=Depends(get_db)
):
    """
    Holt KPIs für eine spezifische Entity über einen Zeitraum
    
    Beispiel:
    ```
    GET /api/v1/kpi/entity?entity_type=campaign&entity_id=123456&start_date=2025-01-01&end_date=2025-01-31
    ```
    """
    try:
        result = await KPIService.get_kpi_for_entity(
            entity_type=entity_type,
            entity_id=entity_id,
            start_date=start_date,
            end_date=end_date
        )
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interner Fehler: {str(e)}")


@router.get("/trend")
async def get_kpi_trend(
    entity_type: str = Query(..., regex="^(campaign|adset|ad)$", description="Entity Typ"),
    entity_id: str = Query(..., description="Entity ID"),
    kpi_name: str = Query(..., regex="^(ctr|cpc|roas|cvr|rpm|roi|spend|revenue)$", description="KPI Name"),
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    db=Depends(get_db)
):
    """
    Holt tägliche Trend-Daten für einen bestimmten KPI
    
    Beispiel:
    ```
    GET /api/v1/kpi/trend?entity_type=campaign&entity_id=123456&kpi_name=ctr&start_date=2025-01-01&end_date=2025-01-31
    ```
    """
    try:
        result = await KPIService.get_trend_data(
            entity_type=entity_type,
            entity_id=entity_id,
            kpi_name=kpi_name,
            start_date=start_date,
            end_date=end_date
        )
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interner Fehler: {str(e)}")


@router.get("/compare")
async def compare_kpis(
    entity_type: str = Query(..., regex="^(campaign|adset|ad)$", description="Entity Typ"),
    entity_ids: List[str] = Query(..., description="Liste von Entity IDs"),
    kpi_name: str = Query(..., regex="^(ctr|cpc|roas|cvr|rpm|roi|spend|revenue)$", description="KPI Name"),
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    db=Depends(get_db)
):
    """
    Vergleicht einen KPI über mehrere Entities
    
    Beispiel:
    ```
    GET /api/v1/kpi/compare?entity_type=campaign&entity_ids=123456&entity_ids=789012&kpi_name=roas&start_date=2025-01-01&end_date=2025-01-31
    ```
    """
    try:
        result = await KPIService.get_comparison_data(
            entity_type=entity_type,
            entity_ids=entity_ids,
            kpi_name=kpi_name,
            start_date=start_date,
            end_date=end_date
        )
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interner Fehler: {str(e)}")


@router.post("/campaigns/batch")
async def get_campaign_kpis_batch(
    campaign_ids: List[str],
    start_date: date,
    end_date: date,
    db=Depends(get_db)
):
    """
    Holt KPIs für mehrere Kampagnen in einem Batch Request
    
    Beispiel Request Body:
    ```json
    {
        "campaign_ids": ["123456", "789012"],
        "start_date": "2025-01-01",
        "end_date": "2025-01-31"
    }
    ```
    """
    try:
        result = await KPIService.get_kpis_for_campaign_list(
            campaign_ids=campaign_ids,
            start_date=start_date,
            end_date=end_date
        )
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interner Fehler: {str(e)}")


@router.get("/dashboard/summary")
async def get_dashboard_summary(
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    db=Depends(get_db)
):
    """
    Dashboard Summary mit aggregierten KPIs über alle Kampagnen
    
    Beispiel:
    ```
    GET /api/v1/kpi/dashboard/summary?start_date=2025-01-01&end_date=2025-01-31
    ```
    """
    try:
        # Hole alle verfügbaren Kampagnen
        from app.db.models import Campaign
        campaigns = await Campaign.find().to_list()
        campaign_ids = [c.id for c in campaigns]
        
        if not campaign_ids:
            return {
                "status": "no_data",
                "message": "Keine Kampagnen gefunden",
                "data": {
                    "total_campaigns": 0,
                    "total_spend": 0,
                    "total_revenue": 0,
                    "kpis": {}
                }
            }
        
        # Berechne KPIs für alle Kampagnen
        result = await KPIService.get_kpis_for_campaign_list(
            campaign_ids=campaign_ids,
            start_date=start_date,
            end_date=end_date
        )
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        
        # Summiere über alle Kampagnen
        total_spend = sum(c["raw_metrics"]["spend"] for c in result["data"])
        total_revenue = sum(c["raw_metrics"]["revenue"] for c in result["data"])
        total_impressions = sum(c["raw_metrics"]["impressions"] for c in result["data"])
        total_clicks = sum(c["raw_metrics"]["clicks"] for c in result["data"])
        total_conversions = sum(c["raw_metrics"]["conversions"] for c in result["data"])
        
        # Berechne durchschnittliche KPIs
        avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
        avg_cvr = (total_conversions / total_clicks * 100) if total_clicks > 0 else 0
        total_roas = (total_revenue / total_spend) if total_spend > 0 else 0
        total_roi = ((total_revenue - total_spend) / total_spend * 100) if total_spend > 0 else 0
        
        summary = {
            "total_campaigns": len(campaign_ids),
            "total_spend": round(total_spend, 2),
            "total_revenue": round(total_revenue, 2),
            "total_profit": round(total_revenue - total_spend, 2),
            "kpis": {
                "ctr": round(avg_ctr, 2),
                "cvr": round(avg_cvr, 2),
                "roas": round(total_roas, 2),
                "roi": round(total_roi, 2)
            }
        }
        
        return {
            "status": "success",
            "period": result["period"],
            "data": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interner Fehler: {str(e)}")