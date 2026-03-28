"""
Analytics API Endpoints
Erweiterte Analytics-Funktionen für Dashboards und Reports
Mit echter MongoDB-Datenbank-Anbindung
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
import random

# Import database dependencies
try:
    from app.db.session import get_db
    from app.services.kpi_service import KPIService
    from app.db.models import Metric, Campaign, AdSet, Ad
    from app.processing.kpi_engine import KPIEngine
    from beanie import PydanticObjectId
    DB_AVAILABLE = True
except ImportError as e:
    DB_AVAILABLE = False
    get_db = lambda: None
    print(f"DB import error: {e}")

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def generate_date_range(start_date: date, end_date: date) -> List[date]:
    """Generate list of dates between start and end"""
    dates = []
    current = start_date
    while current <= end_date:
        dates.append(current)
        current += timedelta(days=1)
    return dates


def generate_mock_trend_data(start_date: date, end_date: date, metric: str) -> List[Dict]:
    """Generate realistic mock trend data"""
    dates = generate_date_range(start_date, end_date)
    data = []
    
    # Base values and ranges for different metrics
    ranges = {
        'spend': (50, 200),
        'revenue': (100, 500),
        'ctr': (1.5, 5.0),
        'roas': (1.0, 4.0),
        'cpc': (0.5, 2.5),
        'cvr': (1.0, 8.0),
        'impressions': (1000, 5000),
        'clicks': (20, 150),
        'conversions': (2, 20)
    }
    
    min_val, max_val = ranges.get(metric, (0, 100))
    
    for d in dates:
        # Add some realistic variation
        base = (min_val + max_val) / 2
        variation = random.uniform(-0.3, 0.3) * base
        weekend_factor = 0.7 if d.weekday() >= 5 else 1.0
        
        value = (base + variation) * weekend_factor
        value = max(min_val, min(max_val, value))
        
        data.append({
            "date": d.isoformat(),
            "value": round(value, 2)
        })
    
    return data


async def get_metrics_from_db(
    start_date: date,
    end_date: date,
    campaign_ids: Optional[List[str]] = None
):
    """Get metrics from database with optional campaign filter"""
    if not DB_AVAILABLE:
        return []
    
    query = {
        "date": {"$gte": start_date, "$lte": end_date}
    }
    
    if campaign_ids:
        query["entity_id"] = {"$in": campaign_ids}
        query["entity_type"] = "campaign"
    
    metrics = await Metric.find(query).to_list()
    return metrics


async def calculate_summary_from_metrics(metrics) -> Dict[str, Any]:
    """Calculate summary statistics from metrics"""
    if not metrics:
        return {
            "total_spend": 0,
            "total_revenue": 0,
            "total_impressions": 0,
            "total_clicks": 0,
            "total_conversions": 0,
            "avg_ctr": 0,
            "avg_cpc": 0,
            "avg_roas": 0,
            "avg_cvr": 0,
            "profit": 0
        }
    
    total_spend = sum(float(m.spend) for m in metrics)
    total_revenue = sum(float(m.revenue) for m in metrics)
    total_impressions = sum(m.impressions for m in metrics)
    total_clicks = sum(m.clicks for m in metrics)
    total_conversions = sum(m.conversions for m in metrics)
    
    # Calculate averages
    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    avg_cpc = (total_spend / total_clicks) if total_clicks > 0 else 0
    avg_roas = (total_revenue / total_spend) if total_spend > 0 else 0
    avg_cvr = (total_conversions / total_clicks * 100) if total_clicks > 0 else 0
    
    profit = total_revenue - total_spend
    
    return {
        "total_spend": round(total_spend, 2),
        "total_revenue": round(total_revenue, 2),
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "total_conversions": total_conversions,
        "avg_ctr": round(avg_ctr, 2),
        "avg_cpc": round(avg_cpc, 2),
        "avg_roas": round(avg_roas, 2),
        "avg_cvr": round(avg_cvr, 2),
        "profit": round(profit, 2)
    }


@router.get("/summary")
async def get_analytics_summary(
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    campaign_ids: Optional[List[str]] = Query(None, description="Filter nach Kampagnen-IDs"),
    db=Depends(get_db)
):
    """
    Analytics Summary mit aggregierten Metriken
    """
    days = (end_date - start_date).days + 1
    
    if DB_AVAILABLE:
        try:
            # Get metrics from database
            metrics = await get_metrics_from_db(start_date, end_date, campaign_ids)
            
            if metrics:
                summary = await calculate_summary_from_metrics(metrics)
                
                return {
                    "status": "success",
                    "message": "Daten aus Datenbank",
                    "period": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "days": days
                    },
                    "summary": summary,
                    "campaigns_analyzed": len(campaign_ids) if campaign_ids else len(set(m.entity_id for m in metrics))
                }
        except Exception as e:
            print(f"Error fetching from DB: {e}")
            # Fall through to mock data
    
    # Return mock data if DB not available or error
    return {
        "status": "success",
        "message": "Demo-Daten (Datenbank nicht verfügbar)",
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": days
        },
        "summary": {
            "total_spend": round(random.uniform(1000, 5000) * days / 30, 2),
            "total_revenue": round(random.uniform(3000, 15000) * days / 30, 2),
            "total_impressions": random.randint(50000, 200000) * days // 30,
            "total_clicks": random.randint(1000, 8000) * days // 30,
            "total_conversions": random.randint(100, 800) * days // 30,
            "avg_ctr": round(random.uniform(2.0, 4.5), 2),
            "avg_cpc": round(random.uniform(0.8, 2.0), 2),
            "avg_roas": round(random.uniform(2.0, 4.5), 2),
            "avg_cvr": round(random.uniform(3.0, 7.0), 2),
            "profit": round(random.uniform(2000, 10000) * days / 30, 2)
        },
        "campaigns_analyzed": len(campaign_ids) if campaign_ids else 3
    }


@router.get("/trends")
async def get_analytics_trends(
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    metrics: List[str] = Query(['spend', 'revenue', 'ctr'], description="Metriken für Trends"),
    campaign_ids: Optional[List[str]] = Query(None, description="Filter nach Kampagnen-IDs"),
    db=Depends(get_db)
):
    """
    Trend-Daten für mehrere Metriken über einen Zeitraum
    """
    if DB_AVAILABLE:
        try:
            # Try to get real trend data from database
            trends = await calculate_trends_from_db(start_date, end_date, metrics, campaign_ids)
            if trends:
                return {
                    "status": "success",
                    "message": "Daten aus Datenbank",
                    "period": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat()
                    },
                    "trends": trends
                }
        except Exception as e:
            print(f"Error calculating trends from DB: {e}")
    
    # Return mock trend data
    trends = {}
    for metric in metrics:
        trends[metric] = generate_mock_trend_data(start_date, end_date, metric)
    
    return {
        "status": "success",
        "message": "Demo-Daten (Datenbank nicht verfügbar)",
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "trends": trends
    }


async def calculate_trends_from_db(
    start_date: date,
    end_date: date,
    metrics: List[str],
    campaign_ids: Optional[List[str]] = None
) -> Optional[Dict[str, List[Dict]]]:
    """Calculate daily trends from database"""
    if not DB_AVAILABLE:
        return None
    
    # Get all metrics for the period
    query = {
        "date": {"$gte": start_date, "$lte": end_date}
    }
    
    if campaign_ids:
        query["entity_id"] = {"$in": campaign_ids}
        query["entity_type"] = "campaign"
    
    db_metrics = await Metric.find(query).sort("date").to_list()
    
    if not db_metrics:
        return None
    
    # Group by date
    date_metrics = {}
    for m in db_metrics:
        date_str = m.date.isoformat()
        if date_str not in date_metrics:
            date_metrics[date_str] = []
        date_metrics[date_str].append(m)
    
    # Calculate trends for each metric
    trends = {}
    for metric_name in metrics:
        trend_data = []
        for d in generate_date_range(start_date, end_date):
            date_str = d.isoformat()
            day_metrics = date_metrics.get(date_str, [])
            
            if day_metrics:
                value = calculate_metric_for_day(day_metrics, metric_name)
            else:
                value = 0
            
            trend_data.append({
                "date": date_str,
                "value": round(value, 2)
            })
        
        trends[metric_name] = trend_data
    
    return trends


def calculate_metric_for_day(metrics, metric_name: str) -> float:
    """Calculate a specific metric for a list of daily metrics"""
    total_spend = sum(float(m.spend) for m in metrics)
    total_revenue = sum(float(m.revenue) for m in metrics)
    total_impressions = sum(m.impressions for m in metrics)
    total_clicks = sum(m.clicks for m in metrics)
    total_conversions = sum(m.conversions for m in metrics)
    
    if metric_name == "spend":
        return total_spend
    elif metric_name == "revenue":
        return total_revenue
    elif metric_name == "impressions":
        return total_impressions
    elif metric_name == "clicks":
        return total_clicks
    elif metric_name == "conversions":
        return total_conversions
    elif metric_name == "ctr":
        return (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    elif metric_name == "cpc":
        return (total_spend / total_clicks) if total_clicks > 0 else 0
    elif metric_name == "roas":
        return (total_revenue / total_spend) if total_spend > 0 else 0
    elif metric_name == "cvr":
        return (total_conversions / total_clicks * 100) if total_clicks > 0 else 0
    elif metric_name == "cpm":
        return (total_spend / total_impressions * 1000) if total_impressions > 0 else 0
    elif metric_name == "rpm":
        return (total_revenue / total_impressions * 1000) if total_impressions > 0 else 0
    
    return 0


@router.get("/campaigns")
async def get_campaigns_performance(
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    sort_by: str = Query("roas", description="Sortierung nach: roas, ctr, cvr, cpc, spend, revenue"),
    limit: int = Query(10, description="Anzahl der Kampagnen"),
    db=Depends(get_db)
):
    """
    Kampagnen-Performance mit Ranking
    """
    if DB_AVAILABLE:
        try:
            # Get campaigns from database
            campaigns = await Campaign.find().to_list()
            
            if campaigns:
                campaign_performance = []
                
                for campaign in campaigns:
                    # Get metrics for this campaign
                    metrics = await Metric.find({
                        "entity_type": "campaign",
                        "entity_id": campaign.id,
                        "date": {"$gte": start_date, "$lte": end_date}
                    }).to_list()
                    
                    if metrics:
                        summary = await calculate_summary_from_metrics(metrics)
                        
                        campaign_performance.append({
                            "id": campaign.id,
                            "name": campaign.name,
                            "status": campaign.status,
                            **summary
                        })
                
                # Sort by specified metric
                campaign_performance.sort(key=lambda x: x.get(sort_by, 0), reverse=True)
                
                return {
                    "status": "success",
                    "message": "Daten aus Datenbank",
                    "period": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat()
                    },
                    "sort_by": sort_by,
                    "campaigns": campaign_performance[:limit]
                }
        except Exception as e:
            print(f"Error fetching campaigns from DB: {e}")
    
    # Return mock data
    mock_campaigns = [
        {
            "id": f"camp_{i}",
            "name": f"Kampagne {i+1}",
            "status": "ACTIVE" if i % 2 == 0 else "PAUSED",
            "spend": round(random.uniform(500, 3000), 2),
            "revenue": round(random.uniform(1500, 12000), 2),
            "impressions": random.randint(10000, 100000),
            "clicks": random.randint(200, 3000),
            "conversions": random.randint(10, 300),
            "ctr": round(random.uniform(1.5, 5.0), 2),
            "roas": round(random.uniform(1.2, 5.5), 2),
            "cvr": round(random.uniform(2.0, 8.0), 2)
        }
        for i in range(limit)
    ]
    
    # Sort mock data
    mock_campaigns.sort(key=lambda x: x.get(sort_by, 0), reverse=True)
    
    return {
        "status": "success",
        "message": "Demo-Daten (Datenbank nicht verfügbar)",
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "sort_by": sort_by,
        "campaigns": mock_campaigns
    }


@router.get("/breakdown")
async def get_metrics_breakdown(
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    group_by: str = Query("campaign", description="Gruppierung: campaign, adset, ad, day, week, month"),
    campaign_ids: Optional[List[str]] = Query(None, description="Filter nach Kampagnen-IDs"),
    db=Depends(get_db)
):
    """
    Detaillierter Aufschlüsselung der Metriken nach verschiedenen Dimensionen
    """
    if DB_AVAILABLE:
        try:
            breakdown_data = await calculate_breakdown_from_db(
                start_date, end_date, group_by, campaign_ids
            )
            
            if breakdown_data:
                return {
                    "status": "success",
                    "message": "Daten aus Datenbank",
                    "period": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat()
                    },
                    "group_by": group_by,
                    "breakdown": breakdown_data
                }
        except Exception as e:
            print(f"Error calculating breakdown from DB: {e}")
    
    # Return mock breakdown data
    days = (end_date - start_date).days + 1
    
    if group_by == "campaign":
        breakdown = {
            "categories": [f"Kampagne {i+1}" for i in range(5)],
            "data": {
                "spend": [round(random.uniform(200, 1000), 2) for _ in range(5)],
                "revenue": [round(random.uniform(800, 4000), 2) for _ in range(5)],
                "roas": [round(random.uniform(1.5, 4.5), 2) for _ in range(5)],
                "impressions": [random.randint(5000, 50000) for _ in range(5)],
                "clicks": [random.randint(100, 1500) for _ in range(5)],
                "conversions": [random.randint(5, 150) for _ in range(5)]
            }
        }
    elif group_by in ["day", "week", "month"]:
        num_points = min(days, 30)
        breakdown = {
            "categories": [f"Tag {i+1}" for i in range(num_points)],
            "data": {
                "spend": [round(random.uniform(50, 200), 2) for _ in range(num_points)],
                "revenue": [round(random.uniform(150, 600), 2) for _ in range(num_points)],
                "roas": [round(random.uniform(1.5, 4.0), 2) for _ in range(num_points)],
                "ctr": [round(random.uniform(1.5, 5.0), 2) for _ in range(num_points)],
                "impressions": [random.randint(1000, 5000) for _ in range(num_points)],
                "clicks": [random.randint(20, 200) for _ in range(num_points)]
            }
        }
    elif group_by == "ad":
        n = 6
        spends   = [round(random.uniform(80, 500), 2) for _ in range(n)]
        revenues = [round(random.uniform(200, 1500), 2) for _ in range(n)]
        clicks_l = [random.randint(30, 300) for _ in range(n)]
        impr_l   = [random.randint(1000, 8000) for _ in range(n)]
        conv_l   = [random.randint(1, 40) for _ in range(n)]
        breakdown = {
            "categories": [f"Ad {i+1}" for i in range(n)],
            "data": {
                "spend":       spends,
                "revenue":     revenues,
                "roas":        [round(revenues[i] / spends[i], 2) if spends[i] else 0 for i in range(n)],
                "ctr":         [round(clicks_l[i] / impr_l[i] * 100, 2) if impr_l[i] else 0 for i in range(n)],
                "cpc":         [round(spends[i] / clicks_l[i], 2) if clicks_l[i] else 0 for i in range(n)],
                "clicks":      clicks_l,
                "impressions": impr_l,
                "conversions": conv_l,
            }
        }
    elif group_by == "adset":
        n = 4
        spends   = [round(random.uniform(150, 800), 2) for _ in range(n)]
        revenues = [round(random.uniform(400, 2400), 2) for _ in range(n)]
        clicks_l = [random.randint(60, 500) for _ in range(n)]
        impr_l   = [random.randint(2000, 15000) for _ in range(n)]
        conv_l   = [random.randint(3, 60) for _ in range(n)]
        breakdown = {
            "categories": [f"AdSet {i+1}" for i in range(n)],
            "data": {
                "spend":       spends,
                "revenue":     revenues,
                "roas":        [round(revenues[i] / spends[i], 2) if spends[i] else 0 for i in range(n)],
                "ctr":         [round(clicks_l[i] / impr_l[i] * 100, 2) if impr_l[i] else 0 for i in range(n)],
                "cpc":         [round(spends[i] / clicks_l[i], 2) if clicks_l[i] else 0 for i in range(n)],
                "clicks":      clicks_l,
                "impressions": impr_l,
                "conversions": conv_l,
            }
        }
    else:
        breakdown = {
            "categories": [f"Gruppe {i+1}" for i in range(5)],
            "data": {
                "spend": [round(random.uniform(200, 1000), 2) for _ in range(5)],
                "revenue": [round(random.uniform(800, 4000), 2) for _ in range(5)],
                "roas": [round(random.uniform(1.5, 4.5), 2) for _ in range(5)]
            }
        }
    
    return {
        "status": "success",
        "message": "Demo-Daten (Datenbank nicht verfügbar)",
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "group_by": group_by,
        "breakdown": breakdown
    }


async def calculate_breakdown_from_db(
    start_date: date,
    end_date: date,
    group_by: str,
    campaign_ids: Optional[List[str]] = None
) -> Optional[Dict]:
    """Calculate breakdown from database"""
    if not DB_AVAILABLE:
        return None
    
    if group_by == "campaign":
        return await calculate_campaign_breakdown(start_date, end_date, campaign_ids)
    elif group_by == "day":
        return await calculate_daily_breakdown(start_date, end_date, campaign_ids)
    elif group_by == "adset":
        return await calculate_adset_breakdown(start_date, end_date, campaign_ids)
    
    return None


async def calculate_campaign_breakdown(
    start_date: date,
    end_date: date,
    campaign_ids: Optional[List[str]] = None
) -> Optional[Dict]:
    """Calculate breakdown by campaign"""
    query = {
        "entity_type": "campaign",
        "date": {"$gte": start_date, "$lte": end_date}
    }
    
    if campaign_ids:
        query["entity_id"] = {"$in": campaign_ids}
    
    metrics = await Metric.find(query).to_list()
    
    if not metrics:
        return None
    
    # Group by campaign
    campaign_data = {}
    for m in metrics:
        if m.entity_id not in campaign_data:
            campaign_data[m.entity_id] = []
        campaign_data[m.entity_id].append(m)
    
    # Get campaign names
    campaigns = await Campaign.find({"id": {"$in": list(campaign_data.keys())}}).to_list()
    campaign_names = {c.id: c.name for c in campaigns}
    
    # Calculate metrics for each campaign
    categories = []
    spend_data = []
    revenue_data = []
    roas_data = []
    impressions_data = []
    clicks_data = []
    conversions_data = []
    
    for camp_id, camp_metrics in campaign_data.items():
        summary = await calculate_summary_from_metrics(camp_metrics)
        
        categories.append(campaign_names.get(camp_id, camp_id))
        spend_data.append(summary["total_spend"])
        revenue_data.append(summary["total_revenue"])
        roas_data.append(summary["avg_roas"])
        impressions_data.append(summary["total_impressions"])
        clicks_data.append(summary["total_clicks"])
        conversions_data.append(summary["total_conversions"])
    
    return {
        "categories": categories,
        "data": {
            "spend": spend_data,
            "revenue": revenue_data,
            "roas": roas_data,
            "impressions": impressions_data,
            "clicks": clicks_data,
            "conversions": conversions_data
        }
    }


async def calculate_daily_breakdown(
    start_date: date,
    end_date: date,
    campaign_ids: Optional[List[str]] = None
) -> Optional[Dict]:
    """Calculate breakdown by day"""
    query = {
        "date": {"$gte": start_date, "$lte": end_date}
    }
    
    if campaign_ids:
        query["entity_id"] = {"$in": campaign_ids}
        query["entity_type"] = "campaign"
    
    metrics = await Metric.find(query).to_list()
    
    if not metrics:
        return None
    
    # Group by date
    date_data = {}
    for m in metrics:
        date_str = m.date.isoformat()
        if date_str not in date_data:
            date_data[date_str] = []
        date_data[date_str].append(m)
    
    # Calculate metrics for each date
    categories = []
    spend_data = []
    revenue_data = []
    roas_data = []
    ctr_data = []
    impressions_data = []
    clicks_data = []
    
    for d in generate_date_range(start_date, end_date):
        date_str = d.isoformat()
        day_metrics = date_data.get(date_str, [])
        
        categories.append(date_str)
        
        if day_metrics:
            summary = await calculate_summary_from_metrics(day_metrics)
            spend_data.append(summary["total_spend"])
            revenue_data.append(summary["total_revenue"])
            roas_data.append(summary["avg_roas"])
            ctr_data.append(summary["avg_ctr"])
            impressions_data.append(summary["total_impressions"])
            clicks_data.append(summary["total_clicks"])
        else:
            spend_data.append(0)
            revenue_data.append(0)
            roas_data.append(0)
            ctr_data.append(0)
            impressions_data.append(0)
            clicks_data.append(0)
    
    return {
        "categories": categories,
        "data": {
            "spend": spend_data,
            "revenue": revenue_data,
            "roas": roas_data,
            "ctr": ctr_data,
            "impressions": impressions_data,
            "clicks": clicks_data
        }
    }


async def calculate_adset_breakdown(
    start_date: date,
    end_date: date,
    campaign_ids: Optional[List[str]] = None
) -> Optional[Dict]:
    """Calculate breakdown by adset"""
    query = {
        "entity_type": "adset",
        "date": {"$gte": start_date, "$lte": end_date}
    }
    
    if campaign_ids:
        # Get adsets for these campaigns
        adsets = await AdSet.find({"campaign_id": {"$in": campaign_ids}}).to_list()
        adset_ids = [a.id for a in adsets]
        query["entity_id"] = {"$in": adset_ids}
    
    metrics = await Metric.find(query).to_list()
    
    if not metrics:
        return None
    
    # Group by adset
    adset_data = {}
    for m in metrics:
        if m.entity_id not in adset_data:
            adset_data[m.entity_id] = []
        adset_data[m.entity_id].append(m)
    
    # Get adset names
    adsets = await AdSet.find({"id": {"$in": list(adset_data.keys())}}).to_list()
    adset_names = {a.id: a.name for a in adsets}
    
    # Calculate metrics for each adset
    categories = []
    spend_data = []
    revenue_data = []
    roas_data = []
    
    for adset_id, adset_metrics in adset_data.items():
        summary = await calculate_summary_from_metrics(adset_metrics)
        
        categories.append(adset_names.get(adset_id, adset_id))
        spend_data.append(summary["total_spend"])
        revenue_data.append(summary["total_revenue"])
        roas_data.append(summary["avg_roas"])
    
    return {
        "categories": categories,
        "data": {
            "spend": spend_data,
            "revenue": revenue_data,
            "roas": roas_data
        }
    }


@router.get("/comparison")
async def get_period_comparison(
    start_date: date = Query(..., description="Start Datum aktuelle Periode (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum aktuelle Periode (YYYY-MM-DD)"),
    compare_to_days: int = Query(30, description="Vergleich mit vorherigen X Tagen"),
    campaign_ids: Optional[List[str]] = Query(None, description="Filter nach Kampagnen-IDs"),
    db=Depends(get_db)
):
    """
    Vergleicht aktuelle Periode mit vorheriger Periode
    """
    # Calculate previous period
    period_days = (end_date - start_date).days + 1
    prev_end = start_date - timedelta(days=1)
    prev_start = prev_end - timedelta(days=period_days - 1)
    
    if DB_AVAILABLE:
        try:
            # Get current period metrics
            current_metrics = await get_metrics_from_db(start_date, end_date, campaign_ids)
            prev_metrics = await get_metrics_from_db(prev_start, prev_end, campaign_ids)
            
            if current_metrics or prev_metrics:
                current_summary = await calculate_summary_from_metrics(current_metrics)
                prev_summary = await calculate_summary_from_metrics(prev_metrics)
                
                # Calculate changes
                def calc_change(current, previous):
                    if previous == 0:
                        return 100 if current > 0 else 0
                    return round(((current - previous) / previous) * 100, 2)
                
                comparison = {
                    "current_period": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        **current_summary
                    },
                    "previous_period": {
                        "start_date": prev_start.isoformat(),
                        "end_date": prev_end.isoformat(),
                        **prev_summary
                    },
                    "changes": {
                        "spend_change": calc_change(current_summary["total_spend"], prev_summary["total_spend"]),
                        "revenue_change": calc_change(current_summary["total_revenue"], prev_summary["total_revenue"]),
                        "roas_change": calc_change(current_summary["avg_roas"], prev_summary["avg_roas"]),
                        "ctr_change": calc_change(current_summary["avg_ctr"], prev_summary["avg_ctr"]),
                        "cvr_change": calc_change(current_summary["avg_cvr"], prev_summary["avg_cvr"]),
                        "profit_change": calc_change(current_summary["profit"], prev_summary["profit"])
                    }
                }
                
                return {
                    "status": "success",
                    "message": "Daten aus Datenbank",
                    "comparison": comparison
                }
        except Exception as e:
            print(f"Error calculating comparison from DB: {e}")
    
    # Return mock comparison
    days = period_days
    comparison = {
        "current_period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_spend": round(random.uniform(1000, 5000) * days / 30, 2),
            "total_revenue": round(random.uniform(3000, 15000) * days / 30, 2),
            "avg_roas": round(random.uniform(2.0, 4.5), 2),
            "avg_ctr": round(random.uniform(2.0, 4.5), 2),
            "avg_cvr": round(random.uniform(3.0, 7.0), 2),
            "profit": round(random.uniform(2000, 10000) * days / 30, 2)
        },
        "previous_period": {
            "start_date": prev_start.isoformat(),
            "end_date": prev_end.isoformat(),
            "total_spend": round(random.uniform(1000, 5000) * days / 30, 2),
            "total_revenue": round(random.uniform(3000, 15000) * days / 30, 2),
            "avg_roas": round(random.uniform(2.0, 4.5), 2),
            "avg_ctr": round(random.uniform(2.0, 4.5), 2),
            "avg_cvr": round(random.uniform(3.0, 7.0), 2),
            "profit": round(random.uniform(2000, 10000) * days / 30, 2)
        },
        "changes": {
            "spend_change": round(random.uniform(-20, 20), 2),
            "revenue_change": round(random.uniform(-20, 30), 2),
            "roas_change": round(random.uniform(-15, 25), 2),
            "ctr_change": round(random.uniform(-10, 15), 2),
            "cvr_change": round(random.uniform(-20, 30), 2),
            "profit_change": round(random.uniform(-25, 35), 2)
        }
    }
    
    return {
        "status": "success",
        "message": "Demo-Daten (Datenbank nicht verfügbar)",
        "comparison": comparison
    }


@router.get("/export")
async def export_analytics(
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    format: str = Query("csv", description="Export Format: csv, json, xlsx"),
    campaign_ids: Optional[List[str]] = Query(None, description="Filter nach Kampagnen-IDs"),
    db=Depends(get_db)
):
    """
    Exportiert Analytics-Daten im gewünschten Format
    """
    try:
        # Get summary data
        if DB_AVAILABLE:
            metrics = await get_metrics_from_db(start_date, end_date, campaign_ids)
            summary = await calculate_summary_from_metrics(metrics)
        else:
            # Generate mock data
            days = (end_date - start_date).days + 1
            summary = {
                "total_spend": round(random.uniform(1000, 5000) * days / 30, 2),
                "total_revenue": round(random.uniform(3000, 15000) * days / 30, 2),
                "total_impressions": random.randint(50000, 200000),
                "total_clicks": random.randint(1000, 5000),
                "total_conversions": random.randint(50, 300),
                "avg_ctr": round(random.uniform(2.0, 4.5), 2),
                "avg_cpc": round(random.uniform(0.5, 2.0), 2),
                "avg_roas": round(random.uniform(2.0, 4.5), 2),
                "avg_cvr": round(random.uniform(3.0, 7.0), 2),
                "profit": round(random.uniform(2000, 10000) * days / 30, 2)
            }
        
        if format.lower() == "json":
            return {
                "status": "success",
                "format": "json",
                "data": summary
            }
        elif format.lower() == "csv":
            # Generate CSV content
            csv_lines = [
                "Metrik,Wert",
                f"Gesamtausgaben,€{summary['total_spend']:.2f}",
                f"Gesamtumsatz,€{summary['total_revenue']:.2f}",
                f"Gewinn,€{summary['profit']:.2f}",
                f"ROAS,{summary['avg_roas']:.2f}x",
                f"CTR,{summary['avg_ctr']:.2f}%",
                f"CVR,{summary['avg_cvr']:.2f}%",
                f"CPC,€{summary['avg_cpc']:.2f}",
                f"Impressions,{summary['total_impressions']}",
                f"Clicks,{summary['total_clicks']}",
                f"Conversions,{summary['total_conversions']}"
            ]
            csv_content = "\n".join(csv_lines)
            
            return {
                "status": "success",
                "format": "csv",
                "data": csv_content
            }
        else:
            return {
                "status": "success",
                "format": format,
                "data": summary
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/period-comparison")
async def get_period_comparison(
    start_date: date = Query(..., description="Start Datum aktueller Zeitraum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum aktueller Zeitraum (YYYY-MM-DD)"),
    compare_mode: str = Query("previous_period", description="Vergleichsmodus: previous_period, previous_year, custom"),
    compare_start_date: Optional[date] = Query(None, description="Start Datum Vergleichszeitraum (bei custom)"),
    compare_end_date: Optional[date] = Query(None, description="End Datum Vergleichszeitraum (bei custom)"),
    group_by: str = Query("campaign", description="Gruppierung: campaign, adset, ad, day, week, month"),
    campaign_ids: Optional[List[str]] = Query(None, description="Filter nach Kampagnen-IDs"),
    db=Depends(get_db)
):
    """
    Zeitraumvergleich für KPIs
    
    Vergleicht den aktuellen Zeitraum mit einem vorherigen Zeitraum.
    
    Beispiele:
    - Letzte 7 Tage vs. Vorherige 7 Tage
    - Dieser Monat vs. Voriger Monat
    - Q1 2025 vs. Q1 2024
    
    Returns:
        Aktueller Zeitraum, Vergleichszeitraum, KPIs mit Veränderungen
    """
    days = (end_date - start_date).days + 1
    
    # Berechne Vergleichszeitraum basierend auf Modus
    if compare_mode == "previous_period":
        # Gleicher Zeitraum davor
        compare_end = start_date - timedelta(days=1)
        compare_start = compare_end - timedelta(days=days - 1)
    elif compare_mode == "previous_year":
        # Gleicher Zeitraum im Vorjahr
        compare_start = start_date.replace(year=start_date.year - 1)
        compare_end = end_date.replace(year=end_date.year - 1)
    elif compare_mode == "custom" and compare_start_date and compare_end_date:
        compare_start = compare_start_date
        compare_end = compare_end_date
    else:
        raise HTTPException(
            status_code=400, 
            detail="Ungültiger Vergleichsmodus oder fehlende Vergleichsdaten"
        )
    
    if DB_AVAILABLE:
        try:
            # Hole Metriken für beide Zeiträume
            current_metrics = await get_metrics_from_db(start_date, end_date, campaign_ids)
            compare_metrics = await get_metrics_from_db(compare_start, compare_end, campaign_ids)
            
            current_summary = await calculate_summary_from_metrics(current_metrics)
            compare_summary = await calculate_summary_from_metrics(compare_metrics)
            
            # Berechne Veränderungen
            changes = calculate_period_changes(current_summary, compare_summary)
            
            # Hole Kampagnen-Details
            campaigns_data = []
            if campaign_ids:
                for cid in campaign_ids:
                    campaign = await Campaign.find_one({"id": cid})
                    if campaign:
                        campaigns_data.append({
                            "id": campaign.id,
                            "name": campaign.name,
                            "status": campaign.status
                        })
            
            return {
                "status": "success",
                "message": "Daten aus Datenbank",
                "current_period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": days,
                    "summary": current_summary
                },
                "comparison_period": {
                    "start_date": compare_start.isoformat(),
                    "end_date": compare_end.isoformat(),
                    "days": (compare_end - compare_start).days + 1,
                    "summary": compare_summary
                },
                "changes": changes,
                "campaigns": campaigns_data,
                "group_by": group_by
            }
        except Exception as e:
            print(f"Error in period comparison: {e}")
            # Fall through to mock data
    
    # Mock-Daten wenn DB nicht verfügbar
    current_summary = {
        "total_spend": round(random.uniform(2000, 6000), 2),
        "total_revenue": round(random.uniform(6000, 18000), 2),
        "total_impressions": random.randint(80000, 300000),
        "total_clicks": random.randint(2000, 10000),
        "total_conversions": random.randint(150, 1000),
        "avg_ctr": round(random.uniform(2.0, 4.5), 2),
        "avg_cpc": round(random.uniform(0.8, 2.0), 2),
        "avg_roas": round(random.uniform(2.5, 5.0), 2),
        "avg_cvr": round(random.uniform(3.5, 8.0), 2),
        "profit": round(random.uniform(3000, 12000), 2)
    }
    
    # Vergleichswerte leicht variiert
    variance_factor = random.uniform(0.8, 1.3)
    compare_summary = {
        "total_spend": round(current_summary["total_spend"] * variance_factor, 2),
        "total_revenue": round(current_summary["total_revenue"] * random.uniform(0.7, 1.4), 2),
        "total_impressions": int(current_summary["total_impressions"] * variance_factor),
        "total_clicks": int(current_summary["total_clicks"] * variance_factor),
        "total_conversions": int(current_summary["total_conversions"] * random.uniform(0.6, 1.5)),
        "avg_ctr": round(current_summary["avg_ctr"] * random.uniform(0.8, 1.3), 2),
        "avg_cpc": round(current_summary["avg_cpc"] * random.uniform(0.8, 1.4), 2),
        "avg_roas": round(current_summary["avg_roas"] * random.uniform(0.7, 1.3), 2),
        "avg_cvr": round(current_summary["avg_cvr"] * random.uniform(0.6, 1.4), 2),
        "profit": round(current_summary["profit"] * random.uniform(0.5, 1.6), 2)
    }
    
    changes = calculate_period_changes(current_summary, compare_summary)
    
    return {
        "status": "success",
        "message": "Demo-Daten (Datenbank nicht verfügbar)",
        "current_period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": days,
            "summary": current_summary
        },
        "comparison_period": {
            "start_date": compare_start.isoformat(),
            "end_date": compare_end.isoformat(),
            "days": (compare_end - compare_start).days + 1,
            "summary": compare_summary
        },
        "changes": changes,
        "campaigns": [
            {"id": "camp_001", "name": "Summer Sale 2025", "status": "ACTIVE"},
            {"id": "camp_002", "name": "Brand Awareness", "status": "ACTIVE"},
            {"id": "camp_003", "name": "Retargeting", "status": "PAUSED"}
        ],
        "group_by": group_by
    }


def calculate_period_changes(current: dict, compare: dict) -> dict:
    """Berechne prozentuale Veränderungen zwischen zwei Perioden"""
    changes = {}
    
    for key in current:
        if key in compare and isinstance(current[key], (int, float)) and isinstance(compare[key], (int, float)):
            if compare[key] != 0:
                change_pct = ((current[key] - compare[key]) / compare[key]) * 100
                changes[key] = {
                    "absolute": round(current[key] - compare[key], 2),
                    "percentage": round(change_pct, 2),
                    "direction": "up" if change_pct > 0 else "down" if change_pct < 0 else "neutral"
                }
            else:
                changes[key] = {
                    "absolute": round(current[key], 2),
                    "percentage": 100.0 if current[key] > 0 else 0.0,
                    "direction": "up" if current[key] > 0 else "neutral"
                }
    
    return changes
