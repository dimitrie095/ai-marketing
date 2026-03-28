"""
KPI Analytics API Endpoints
Phase 2: i-02 - Core Features & KPI Engine
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import date, datetime

# Try to import database dependencies, fallback to None if not available
try:
    from app.db.session import get_db
    from app.services.kpi_service import KPIService
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False
    get_db = lambda: None

router = APIRouter(prefix="/kpi", tags=["KPI"])


@router.get("/entity")
async def get_entity_kpis(
    entity_type: str = Query(..., pattern="^(campaign|adset|ad)$", description="Entity Typ"),
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
    if not DB_AVAILABLE:
        return {
            "status": "success",
            "message": "Demo-Daten (Datenbank nicht verfügbar)",
            "data": {
                "ctr": 2.5,
                "cpc": 1.25,
                "roas": 2.8,
                "cvr": 3.5,
                "rpm": 15.5,
                "roi": 125.0
            }
        }
    
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
    entity_type: str = Query(..., pattern="^(campaign|adset|ad)$", description="Entity Typ"),
    entity_id: str = Query(..., description="Entity ID"),
    kpi_name: str = Query(..., pattern="^(ctr|cpc|roas|cvr|rpm|roi|spend|revenue|clicks|impressions)$", description="KPI Name"),
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
    if not DB_AVAILABLE:
        import random
        from datetime import timedelta
        data = []
        current = start_date
        while current <= end_date:
            impressions = random.randint(2000, 8000)
            clicks = random.randint(60, 400)
            spend = round(random.uniform(80, 600), 2)
            revenue = round(random.uniform(150, 1200), 2)
            conversions = random.randint(2, 30)

            if kpi_name == "ctr":
                value = round(clicks / impressions * 100, 2)
            elif kpi_name == "cpc":
                value = round(spend / clicks, 2) if clicks else 0.0
            elif kpi_name == "roas":
                value = round(revenue / spend, 2) if spend else 0.0
            elif kpi_name == "cvr":
                value = round(conversions / clicks * 100, 2) if clicks else 0.0
            elif kpi_name == "rpm":
                value = round(revenue / impressions * 1000, 2) if impressions else 0.0
            elif kpi_name == "roi":
                value = round((revenue - spend) / spend * 100, 2) if spend else 0.0
            elif kpi_name == "spend":
                value = spend
            elif kpi_name == "revenue":
                value = revenue
            elif kpi_name == "clicks":
                value = float(clicks)
            elif kpi_name == "impressions":
                value = float(impressions)
            else:
                value = 0.0

            data.append({
                "date": current.isoformat(),
                "value": value,
                "raw_metrics": {
                    "impressions": impressions,
                    "clicks": clicks,
                    "conversions": conversions,
                    "spend": spend,
                    "revenue": revenue,
                },
            })
            current += timedelta(days=1)
        return {
            "status": "success",
            "message": "Demo-Daten (Datenbank nicht verfügbar)",
            "kpi": kpi_name,
            "data": data
        }
    
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
    entity_type: str = Query(..., pattern="^(campaign|adset|ad)$", description="Entity Typ"),
    entity_ids: List[str] = Query(..., description="Liste von Entity IDs"),
    kpi_name: str = Query(..., pattern="^(ctr|cpc|roas|cvr|rpm|roi|spend|revenue)$", description="KPI Name"),
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
    if not DB_AVAILABLE:
        import random
        comparison_data = []
        for eid in entity_ids:
            comparison_data.append({
                "entity_id": eid,
                "value": round(random.uniform(1.0, 5.0), 2)
            })
        comparison_data.sort(key=lambda x: x["value"], reverse=True)
        return {
            "status": "success",
            "message": "Demo-Daten (Datenbank nicht verfügbar)",
            "kpi": kpi_name,
            "data": comparison_data
        }
    
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
    if not DB_AVAILABLE:
        results = []
        for cid in campaign_ids:
            results.append({
                "campaign_id": cid,
                "kpis": {
                    "ctr": 2.5,
                    "cpc": 1.25,
                    "roas": 2.8,
                    "cvr": 3.5
                },
                "raw_metrics": {
                    "impressions": 10000,
                    "clicks": 250,
                    "conversions": 10,
                    "spend": 312.50,
                    "revenue": 875.00
                }
            })
        return {
            "status": "success",
            "message": "Demo-Daten (Datenbank nicht verfügbar)",
            "data": results
        }
    
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
    # If database is not available, return demo data
    if not DB_AVAILABLE:
        return {
            "status": "success",
            "message": "Demo-Daten (Datenbank nicht verfügbar)",
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "data": {
                "total_campaigns": 3,
                "total_spend": 5250.50,
                "total_revenue": 12890.00,
                "total_profit": 7639.50,
                "kpis": {
                    "ctr": 2.85,
                    "cvr": 4.2,
                    "roas": 2.46,
                    "roi": 145.5
                }
            }
        }
    
    try:
        # Hole alle verfügbaren Kampagnen
        from app.db.models import Campaign
        campaigns = await Campaign.find().to_list()
        campaign_ids = [str(c.id) for c in campaigns]
        
        if not campaign_ids:
            # Return default data structure when no campaigns exist
            return {
                "status": "no_data",
                "message": "Keine Kampagnen gefunden",
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "data": {
                    "total_campaigns": 0,
                    "total_spend": 0,
                    "total_revenue": 0,
                    "total_profit": 0,
                    "kpis": {
                        "ctr": 0,
                        "cvr": 0,
                        "roas": 0,
                        "roi": 0
                    }
                }
            }
        
        # Berechne KPIs für alle Kampagnen
        result = await KPIService.get_kpis_for_campaign_list(
            campaign_ids=campaign_ids,
            start_date=start_date,
            end_date=end_date
        )
        
        if result["status"] == "error":
            # Return default data on error instead of throwing
            return {
                "status": "no_data",
                "message": result.get("message", "Fehler beim Laden der Daten"),
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "data": {
                    "total_campaigns": len(campaign_ids),
                    "total_spend": 0,
                    "total_revenue": 0,
                    "total_profit": 0,
                    "kpis": {
                        "ctr": 0,
                        "cvr": 0,
                        "roas": 0,
                        "roi": 0
                    }
                }
            }
        
        # Handle case where data is empty
        if not result.get("data"):
            return {
                "status": "no_data",
                "message": "Keine Metrik-Daten für den Zeitraum gefunden",
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "data": {
                    "total_campaigns": len(campaign_ids),
                    "total_spend": 0,
                    "total_revenue": 0,
                    "total_profit": 0,
                    "kpis": {
                        "ctr": 0,
                        "cvr": 0,
                        "roas": 0,
                        "roi": 0
                    }
                }
            }
        
        # Summiere über alle Kampagnen
        total_spend = sum(c.get("raw_metrics", {}).get("spend", 0) for c in result["data"])
        total_revenue = sum(c.get("raw_metrics", {}).get("revenue", 0) for c in result["data"])
        total_impressions = sum(c.get("raw_metrics", {}).get("impressions", 0) for c in result["data"])
        total_clicks = sum(c.get("raw_metrics", {}).get("clicks", 0) for c in result["data"])
        total_conversions = sum(c.get("raw_metrics", {}).get("conversions", 0) for c in result["data"])
        
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
            "period": result.get("period", {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }),
            "data": summary
        }
    except Exception as e:
        # Log the error but return a valid response instead of 500
        import logging
        logging.error(f"Dashboard summary error: {str(e)}")
        return {
            "status": "no_data",
            "message": f"Fehler: {str(e)}",
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "data": {
                "total_campaigns": 0,
                "total_spend": 0,
                "total_revenue": 0,
                "total_profit": 0,
                "kpis": {
                    "ctr": 0,
                    "cvr": 0,
                    "roas": 0,
                    "roi": 0
                }
            }
        }