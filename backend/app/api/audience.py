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
    from app.db.models import Metric, Campaign, AudienceDemographic
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


async def fetch_demographics_from_db(campaign_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Fetch demographic data from database, optionally filtered by campaign IDs.
    If no campaign_ids provided, aggregate all available demographics.
    """
    try:
        if not DB_AVAILABLE:
            return generate_mock_demographics()
        
        query = {}
        if campaign_ids:
            query["campaign_id"] = {"$in": campaign_ids}
        
        demographics = await AudienceDemographic.find(query).to_list()
        
        if not demographics:
            # Fallback to mock data if no records found
            return generate_mock_demographics()
        
        # Aggregate percentages across multiple campaigns
        total = len(demographics)
        age_18_24 = sum(d.age_18_24 for d in demographics) / total
        age_25_34 = sum(d.age_25_34 for d in demographics) / total
        age_35_44 = sum(d.age_35_44 for d in demographics) / total
        age_45_54 = sum(d.age_45_54 for d in demographics) / total
        age_55_plus = sum(d.age_55_plus for d in demographics) / total
        
        gender_male = sum(d.gender_male for d in demographics) / total
        gender_female = sum(d.gender_female for d in demographics) / total
        gender_unknown = sum(d.gender_unknown for d in demographics) / total
        
        device_mobile = sum(d.device_mobile for d in demographics) / total
        device_desktop = sum(d.device_desktop for d in demographics) / total
        device_tablet = sum(d.device_tablet for d in demographics) / total
        
        # Convert to frontend format
        age_ranges = [
            {"range": "18-24", "percentage": round(float(age_18_24), 1), "male": round(float(age_18_24) * float(gender_male) / 100, 1), "female": round(float(age_18_24) * float(gender_female) / 100, 1)},
            {"range": "25-34", "percentage": round(float(age_25_34), 1), "male": round(float(age_25_34) * float(gender_male) / 100, 1), "female": round(float(age_25_34) * float(gender_female) / 100, 1)},
            {"range": "35-44", "percentage": round(float(age_35_44), 1), "male": round(float(age_35_44) * float(gender_male) / 100, 1), "female": round(float(age_35_44) * float(gender_female) / 100, 1)},
            {"range": "45-54", "percentage": round(float(age_45_54), 1), "male": round(float(age_45_54) * float(gender_male) / 100, 1), "female": round(float(age_45_54) * float(gender_female) / 100, 1)},
            {"range": "55+", "percentage": round(float(age_55_plus), 1), "male": round(float(age_55_plus) * float(gender_male) / 100, 1), "female": round(float(age_55_plus) * float(gender_female) / 100, 1)},
        ]
        
        gender = {
            "male": round(float(gender_male), 1),
            "female": round(float(gender_female), 1),
            "unknown": round(float(gender_unknown), 1)
        }
        
        return {
            "age_ranges": age_ranges,
            "gender": gender
        }
    except Exception as e:
        print(f"Error fetching demographics from DB: {e}")
        return generate_mock_demographics()

async def fetch_reach_from_db(
    start_date: date,
    end_date: date,
    campaign_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Fetch reach and frequency metrics from database, optionally filtered by campaign IDs.
    Returns total_reach, total_impressions, average_frequency, frequency_distribution, daily_data.
    """
    try:
        if not DB_AVAILABLE:
            # Fallback to mock data
            return generate_mock_reach_metrics(start_date, end_date)
        
        # Build query for metrics
        query = {
            "entity_type": "campaign",
            "date": {"$gte": start_date, "$lte": end_date}
        }
        if campaign_ids:
            query["entity_id"] = {"$in": campaign_ids}
        
        metrics = await Metric.find(query).to_list()
        
        if not metrics:
            # No metrics found, return mock data
            return generate_mock_reach_metrics(start_date, end_date)
        
        # Aggregate total reach and impressions
        total_reach = sum(m.reach for m in metrics)
        total_impressions = sum(m.impressions for m in metrics)
        average_frequency = total_impressions / total_reach if total_reach > 0 else 0
        
        # Group by date for daily data
        daily_map = {}
        for m in metrics:
            day = m.date.isoformat()
            if day not in daily_map:
                daily_map[day] = {"reach": 0, "impressions": 0}
            daily_map[day]["reach"] += m.reach
            daily_map[day]["impressions"] += m.impressions
        
        # Convert to list sorted by date
        daily_data = []
        current_date = start_date
        while current_date <= end_date:
            day_str = current_date.isoformat()
            day_stats = daily_map.get(day_str, {"reach": 0, "impressions": 0})
            frequency = day_stats["impressions"] / day_stats["reach"] if day_stats["reach"] > 0 else 0
            daily_data.append({
                "date": day_str,
                "reach": day_stats["reach"],
                "impressions": day_stats["impressions"],
                "frequency": round(float(frequency), 2)
            })
            current_date += timedelta(days=1)
        
        # Frequency distribution - simplified mock for now
        # TODO: calculate actual distribution from frequency data
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
            "average_frequency": round(float(average_frequency), 2),
            "frequency_distribution": frequency_distribution,
            "daily_data": daily_data
        }
    except Exception as e:
        print(f"Error fetching reach from DB: {e}")
        return generate_mock_reach_metrics(start_date, end_date)

async def fetch_audience_from_db(campaign_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Fetch all audience data from database, optionally filtered by campaign IDs.
    Returns demographics, devices, geographic, interests.
    """
    try:
        if not DB_AVAILABLE:
            # Return empty structure, fallback to mock in endpoints
            return {}
        
        query = {}
        if campaign_ids:
            query["campaign_id"] = {"$in": campaign_ids}
        
        demographics = await AudienceDemographic.find(query).to_list()
        
        if not demographics:
            return {}
        
        total = len(demographics)
        # Aggregate percentages
        age_18_24 = sum(d.age_18_24 for d in demographics) / total
        age_25_34 = sum(d.age_25_34 for d in demographics) / total
        age_35_44 = sum(d.age_35_44 for d in demographics) / total
        age_45_54 = sum(d.age_45_54 for d in demographics) / total
        age_55_plus = sum(d.age_55_plus for d in demographics) / total
        
        gender_male = sum(d.gender_male for d in demographics) / total
        gender_female = sum(d.gender_female for d in demographics) / total
        gender_unknown = sum(d.gender_unknown for d in demographics) / total
        
        device_mobile = sum(d.device_mobile for d in demographics) / total
        device_desktop = sum(d.device_desktop for d in demographics) / total
        device_tablet = sum(d.device_tablet for d in demographics) / total
        
        # Parse top locations and interests from first record (or aggregate?)
        # We'll use the first record's top locations and interests
        first = demographics[0]
        top_locations_str = first.top_locations
        top_interests_str = first.top_interests
        
        # Parse locations
        geographic = []
        if top_locations_str:
            parts = top_locations_str.split(',')
            for part in parts:
                if ':' in part:
                    city, pct = part.split(':', 1)
                    geographic.append({
                        "country": city,
                        "code": city[:2].upper(),
                        "users": int(float(pct) * 1000),  # placeholder
                        "percentage": float(pct)
                    })
        
        # Parse interests
        interests = []
        if top_interests_str:
            parts = top_interests_str.split(',')
            for part in parts:
                if ':' in part:
                    category, pct = part.split(':', 1)
                    interests.append({
                        "category": category,
                        "percentage": float(pct),
                        "affinity_score": min(10, float(pct) / 10 + 5)  # placeholder
                    })
        
        # Build demographics structure
        age_ranges = [
            {"range": "18-24", "percentage": round(float(age_18_24), 1), "male": round(float(age_18_24) * float(gender_male) / 100, 1), "female": round(float(age_18_24) * float(gender_female) / 100, 1)},
            {"range": "25-34", "percentage": round(float(age_25_34), 1), "male": round(float(age_25_34) * float(gender_male) / 100, 1), "female": round(float(age_25_34) * float(gender_female) / 100, 1)},
            {"range": "35-44", "percentage": round(float(age_35_44), 1), "male": round(float(age_35_44) * float(gender_male) / 100, 1), "female": round(float(age_35_44) * float(gender_female) / 100, 1)},
            {"range": "45-54", "percentage": round(float(age_45_54), 1), "male": round(float(age_45_54) * float(gender_male) / 100, 1), "female": round(float(age_45_54) * float(gender_female) / 100, 1)},
            {"range": "55+", "percentage": round(float(age_55_plus), 1), "male": round(float(age_55_plus) * float(gender_male) / 100, 1), "female": round(float(age_55_plus) * float(gender_female) / 100, 1)},
        ]
        
        gender = {
            "male": round(float(gender_male), 1),
            "female": round(float(gender_female), 1),
            "unknown": round(float(gender_unknown), 1)
        }
        
        # Get mock platforms and browsers for consistency
        mock_devices = generate_mock_devices()
        devices = {
            "devices": [
                {"type": "Mobile", "percentage": round(float(device_mobile), 1), "users": int(float(device_mobile) * 1000)},
                {"type": "Desktop", "percentage": round(float(device_desktop), 1), "users": int(float(device_desktop) * 1000)},
                {"type": "Tablet", "percentage": round(float(device_tablet), 1), "users": int(float(device_tablet) * 1000)},
            ],
            "platforms": mock_devices.get("platforms", []),
            "browsers": mock_devices.get("browsers", [])
        }
        
        return {
            "demographics": {"age_ranges": age_ranges, "gender": gender},
            "devices": devices,
            "geographic": geographic,
            "interests": interests
        }
    except Exception as e:
        print(f"Error fetching audience data from DB: {e}")
        return {}


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
    demographics = await fetch_demographics_from_db(campaign_ids)
    
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
    audience_data = await fetch_audience_from_db(campaign_ids)
    geographic = audience_data.get("geographic")
    if not geographic:
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
    audience_data = await fetch_audience_from_db(campaign_ids)
    devices = audience_data.get("devices")
    if not devices:
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
    audience_data = await fetch_audience_from_db(campaign_ids)
    interests = audience_data.get("interests", [])[:limit]
    if not interests:
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
    reach_metrics = await fetch_reach_from_db(start_date, end_date, campaign_ids)
    
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
    audience_data = await fetch_audience_from_db(campaign_ids)
    
    demographics = audience_data.get("demographics")
    if not demographics:
        demographics = generate_mock_demographics()
    
    geographic = audience_data.get("geographic")
    if not geographic:
        geographic = generate_mock_geographic()
    
    devices = audience_data.get("devices")
    if not devices:
        devices = generate_mock_devices()
    
    interests = audience_data.get("interests", [])[:5]
    if not interests:
        interests = generate_mock_interests()[:5]
    
    reach_metrics = await fetch_reach_from_db(start_date, end_date, campaign_ids)
    
    # Calculate summary KPIs
    total_users = sum(c.get("users", 0) for c in geographic)
    top_country = max(geographic, key=lambda x: x.get("users", 0)) if geographic else {"country": "-", "users": 0, "percentage": 0}
    top_device = max(devices.get("devices", []), key=lambda x: x.get("percentage", 0)) if devices.get("devices") else {"type": "-", "percentage": 0}
    top_interest = max(interests, key=lambda x: x.get("percentage", 0)) if interests else {"category": "-", "percentage": 0}
    
    # Primary age group
    primary_age = max(demographics.get("age_ranges", []), key=lambda x: x.get("percentage", 0)) if demographics.get("age_ranges") else {"range": "-", "percentage": 0}
    
    summary = {
        "total_users": total_users,
        "total_reach": reach_metrics["total_reach"],
        "average_frequency": reach_metrics["average_frequency"],
        "top_country": top_country,
        "top_device": top_device,
        "top_interest": top_interest,
        "primary_age_group": primary_age,
        "gender_split": demographics.get("gender", {"male": 0, "female": 0, "unknown": 0})
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
