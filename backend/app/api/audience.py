"""
Audience API Endpoints
Demografische und verhaltensbezogene Audience-Analysen
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
import random

# Import database dependencies
try:
    from app.db.session import get_db
    from app.db.models import Metric, Campaign
    DB_AVAILABLE = True
except ImportError as e:
    DB_AVAILABLE = False
    get_db = lambda: None
    print(f"DB import error: {e}")

router = APIRouter(prefix="/audience", tags=["Audience"])


def generate_mock_demographics() -> Dict[str, Any]:
    """Generate realistic demographic data"""
    # Age distribution
    age_ranges = [
        {"range": "18-24", "percentage": 15.5, "male": 8.2, "female": 7.3},
        {"range": "25-34", "percentage": 28.3, "male": 14.1, "female": 14.2},
        {"range": "35-44", "percentage": 24.7, "male": 12.3, "female": 12.4},
        {"range": "45-54", "percentage": 18.2, "male": 9.1, "female": 9.1},
        {"range": "55-64", "percentage": 9.8, "male": 4.9, "female": 4.9},
        {"range": "65+", "percentage": 3.5, "male": 1.7, "female": 1.8},
    ]
    
    # Gender distribution
    gender_distribution = {
        "male": 49.8,
        "female": 49.5,
        "unknown": 0.7
    }
    
    return {
        "age_ranges": age_ranges,
        "gender": gender_distribution
    }


def generate_mock_geographic() -> List[Dict[str, Any]]:
    """Generate geographic distribution data"""
    countries = [
        {"country": "Deutschland", "code": "DE", "users": 45230, "percentage": 62.5},
        {"country": "Österreich", "code": "AT", "users": 8450, "percentage": 11.7},
        {"country": "Schweiz", "code": "CH", "users": 6210, "percentage": 8.6},
        {"country": "Niederlande", "code": "NL", "users": 4120, "percentage": 5.7},
        {"country": "Frankreich", "code": "FR", "users": 2890, "percentage": 4.0},
        {"country": "Italien", "code": "IT", "users": 2340, "percentage": 3.2},
        {"country": "Spanien", "code": "ES", "users": 1560, "percentage": 2.2},
        {"country": "Sonstige", "code": "OTHER", "users": 1500, "percentage": 2.1},
    ]
    return countries


def generate_mock_devices() -> Dict[str, Any]:
    """Generate device and platform statistics"""
    devices = [
        {"type": "Mobile", "percentage": 68.5, "users": 50230},
        {"type": "Desktop", "percentage": 24.3, "users": 17820},
        {"type": "Tablet", "percentage": 7.2, "users": 5280},
    ]
    
    platforms = [
        {"name": "iOS", "percentage": 52.3, "users": 38340},
        {"name": "Android", "percentage": 38.2, "users": 28010},
        {"name": "Windows", "percentage": 6.8, "users": 4980},
        {"name": "macOS", "percentage": 2.1, "users": 1540},
        {"name": "Sonstige", "percentage": 0.6, "users": 440},
    ]
    
    browsers = [
        {"name": "Safari", "percentage": 48.5, "users": 35540},
        {"name": "Chrome", "percentage": 38.2, "users": 28010},
        {"name": "Facebook App", "percentage": 10.5, "users": 7700},
        {"name": "Firefox", "percentage": 1.8, "users": 1320},
        {"name": "Sonstige", "percentage": 1.0, "users": 730},
    ]
    
    return {
        "devices": devices,
        "platforms": platforms,
        "browsers": browsers
    }


def generate_mock_interests() -> List[Dict[str, Any]]:
    """Generate interest-based audience segments"""
    interests = [
        {"category": "E-Commerce & Shopping", "percentage": 28.5, "affinity_score": 8.2},
        {"category": "Technologie & Gadgets", "percentage": 22.3, "affinity_score": 7.8},
        {"category": "Reisen & Urlaub", "percentage": 19.7, "affinity_score": 7.5},
        {"category": "Fitness & Gesundheit", "percentage": 16.2, "affinity_score": 7.1},
        {"category": "Essen & Trinken", "percentage": 14.8, "affinity_score": 6.9},
        {"category": "Mode & Beauty", "percentage": 13.5, "affinity_score": 6.7},
        {"category": "Sport", "percentage": 12.1, "affinity_score": 6.4},
        {"category": "Unterhaltung", "percentage": 11.8, "affinity_score": 6.3},
        {"category": "Finanzen & Investitionen", "percentage": 9.4, "affinity_score": 5.9},
        {"category": "Bildung & Karriere", "percentage": 8.7, "affinity_score": 5.7},
    ]
    return interests


def generate_mock_reach_metrics(start_date: date, end_date: date) -> Dict[str, Any]:
    """Generate reach and frequency metrics"""
    days = (end_date - start_date).days + 1
    
    # Base metrics
    total_reach = random.randint(45000, 75000)
    total_impressions = total_reach * random.randint(3, 7)
    
    daily_data = []
    current_date = start_date
    
    for i in range(days):
        daily_reach = int(total_reach / days * random.uniform(0.8, 1.2))
        daily_impressions = int(daily_reach * random.uniform(2.5, 4.5))
        frequency = daily_impressions / daily_reach if daily_reach > 0 else 0
        
        daily_data.append({
            "date": current_date.isoformat(),
            "reach": daily_reach,
            "impressions": daily_impressions,
            "frequency": round(frequency, 2)
        })
        current_date += timedelta(days=1)
    
    avg_frequency = total_impressions / total_reach if total_reach > 0 else 0
    
    # Frequency distribution
    frequency_distribution = [
        {"impressions": "1", "users": int(total_reach * 0.25), "percentage": 25.0},
        {"impressions": "2", "users": int(total_reach * 0.20), "percentage": 20.0},
        {"impressions": "3", "users": int(total_reach * 0.18), "percentage": 18.0},
        {"impressions": "4-5", "users": int(total_reach * 0.15), "percentage": 15.0},
        {"impressions": "6-8", "users": int(total_reach * 0.12), "percentage": 12.0},
        {"impressions": "9-12", "users": int(total_reach * 0.07), "percentage": 7.0},
        {"impressions": "13+", "users": int(total_reach * 0.03), "percentage": 3.0},
    ]
    
    return {
        "total_reach": total_reach,
        "total_impressions": total_impressions,
        "average_frequency": round(avg_frequency, 2),
        "frequency_distribution": frequency_distribution,
        "daily_data": daily_data
    }


@router.get("/demographics")
async def get_audience_demographics(
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    campaign_ids: Optional[List[str]] = Query(None, description="Filter nach Kampagnen-IDs"),
    db=Depends(get_db)
):
    """
    Demografische Audience-Daten (Alter, Geschlecht)
    """
    demographics = generate_mock_demographics()
    
    return {
        "status": "success",
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "demographics": demographics
    }


@router.get("/geographic")
async def get_audience_geographic(
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    campaign_ids: Optional[List[str]] = Query(None, description="Filter nach Kampagnen-IDs"),
    db=Depends(get_db)
):
    """
    Geografische Audience-Verteilung
    """
    geographic = generate_mock_geographic()
    
    return {
        "status": "success",
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "geographic": geographic
    }


@router.get("/devices")
async def get_audience_devices(
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    campaign_ids: Optional[List[str]] = Query(None, description="Filter nach Kampagnen-IDs"),
    db=Depends(get_db)
):
    """
    Geräte- und Plattform-Statistiken
    """
    devices = generate_mock_devices()
    
    return {
        "status": "success",
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "devices": devices
    }


@router.get("/interests")
async def get_audience_interests(
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    campaign_ids: Optional[List[str]] = Query(None, description="Filter nach Kampagnen-IDs"),
    limit: int = Query(10, description="Maximale Anzahl an Interessen"),
    db=Depends(get_db)
):
    """
    Interessenbasierte Audience-Segmente
    """
    interests = generate_mock_interests()[:limit]
    
    return {
        "status": "success",
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "interests": interests
    }


@router.get("/reach")
async def get_audience_reach(
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    campaign_ids: Optional[List[str]] = Query(None, description="Filter nach Kampagnen-IDs"),
    db=Depends(get_db)
):
    """
    Reichweite und Frequenz-Metriken
    """
    reach_metrics = generate_mock_reach_metrics(start_date, end_date)
    
    return {
        "status": "success",
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "reach": reach_metrics
    }


@router.get("/summary")
async def get_audience_summary(
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    campaign_ids: Optional[List[str]] = Query(None, description="Filter nach Kampagnen-IDs"),
    db=Depends(get_db)
):
    """
    Zusammenfassung aller Audience-Metriken
    """
    demographics = generate_mock_demographics()
    geographic = generate_mock_geographic()
    devices = generate_mock_devices()
    interests = generate_mock_interests()[:5]
    reach_metrics = generate_mock_reach_metrics(start_date, end_date)
    
    # Calculate summary KPIs
    total_users = sum(c["users"] for c in geographic)
    top_country = max(geographic, key=lambda x: x["users"])
    top_device = max(devices["devices"], key=lambda x: x["percentage"])
    top_interest = max(interests, key=lambda x: x["percentage"])
    
    # Primary age group
    primary_age = max(demographics["age_ranges"], key=lambda x: x["percentage"])
    
    summary = {
        "total_users": total_users,
        "total_reach": reach_metrics["total_reach"],
        "average_frequency": reach_metrics["average_frequency"],
        "top_country": top_country,
        "top_device": top_device,
        "top_interest": top_interest,
        "primary_age_group": primary_age,
        "gender_split": demographics["gender"]
    }
    
    return {
        "status": "success",
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "summary": summary
    }


@router.get("/behavior")
async def get_audience_behavior(
    start_date: date = Query(..., description="Start Datum (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End Datum (YYYY-MM-DD)"),
    campaign_ids: Optional[List[str]] = Query(None, description="Filter nach Kampagnen-IDs"),
    db=Depends(get_db)
):
    """
    Verhaltensbasierte Audience-Insights
    """
    # Engagement by time of day
    hourly_engagement = []
    for hour in range(24):
        if 9 <= hour <= 11:
            engagement = random.uniform(7, 9)
        elif 12 <= hour <= 14:
            engagement = random.uniform(8, 10)
        elif 18 <= hour <= 22:
            engagement = random.uniform(8.5, 10)
        elif 0 <= hour <= 6:
            engagement = random.uniform(1, 3)
        else:
            engagement = random.uniform(4, 7)
        
        hourly_engagement.append({
            "hour": f"{hour:02d}:00",
            "engagement_rate": round(engagement, 2),
            "activity_score": round(engagement * 10, 1)
        })
    
    # Day of week engagement
    days_of_week = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
    daily_engagement = []
    for day in days_of_week:
        if day in ["Samstag", "Sonntag"]:
            engagement = random.uniform(6, 8)
        else:
            engagement = random.uniform(7, 9.5)
        
        daily_engagement.append({
            "day": day,
            "engagement_rate": round(engagement, 2),
            "impressions_share": round(random.uniform(10, 18), 1)
        })
    
    # User segments
    segments = [
        {
            "name": "Neue Nutzer",
            "percentage": 35.2,
            "description": "Erstkontakt mit der Marke",
            "conversion_rate": 2.1
        },
        {
            "name": "Wiederkehrende",
            "percentage": 28.7,
            "description": "Bereits früher exponiert",
            "conversion_rate": 4.5
        },
        {
            "name": "Engagierte",
            "percentage": 22.4,
            "description": "Hohe Interaktionsbereitschaft",
            "conversion_rate": 7.8
        },
        {
            "name": "Loyale Kunden",
            "percentage": 13.7,
            "description": "Bereits Kunden",
            "conversion_rate": 12.3
        },
    ]
    
    return {
        "status": "success",
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "behavior": {
            "hourly_engagement": hourly_engagement,
            "daily_engagement": daily_engagement,
            "user_segments": segments
        }
    }
