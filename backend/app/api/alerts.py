"""
Alerts API Endpoints
Automatic detection and management of KPI alerts and anomalies
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
import random

# Import database dependencies
try:
    from app.db.session import get_db
    from app.db.models import Alert, Metric, Campaign, AdSet, Ad
    from app.services.kpi_service import KPIService
    from beanie import PydanticObjectId
    DB_AVAILABLE = True
except ImportError as e:
    DB_AVAILABLE = False
    get_db = lambda: None
    print(f"DB import error: {e}")

router = APIRouter(prefix="/alerts", tags=["Alerts"])

# Debug DB availability
print(f"[DEBUG] DB_AVAILABLE = {DB_AVAILABLE}")


async def get_alerts_list(
    severity: Optional[str] = Query(None, description="Filter by severity: HIGH, MEDIUM, LOW"),
    status: Optional[str] = Query(None, description="Filter by read status: read, unread"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type: campaign, adset, ad"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
) -> List[Dict[str, Any]]:
    """Retrieve alerts with filters"""
    if not DB_AVAILABLE:
        # Return mock data for development
        return generate_mock_alerts(limit)
    
    query = {}
    if severity:
        query["severity"] = severity.upper()
    if status:
        if status == "read":
            query["is_read"] = True
        elif status == "unread":
            query["is_read"] = False
    if entity_type:
        query["entity_type"] = entity_type.lower()
    
    alerts = await Alert.find(query).sort(-Alert.created_at).skip(skip).limit(limit).to_list()
    
    result = []
    for alert in alerts:
        result.append({
            "id": str(alert.id),
            "entity_type": alert.entity_type,
            "entity_id": alert.entity_id,
            "entity_name": alert.entity_name or alert.entity_id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "title": alert.title,
            "description": alert.description,
            "kpi_name": alert.kpi_name,
            "change_percent": alert.change_percent,
            "root_cause": alert.root_cause,
            "recommendation": alert.recommendation,
            "is_read": alert.is_read,
            "created_at": alert.created_at.isoformat(),
            "updated_at": alert.updated_at.isoformat(),
        })
    
    return result


@router.get("/", response_model=Dict[str, Any])
async def get_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity: HIGH, MEDIUM, LOW"),
    status: Optional[str] = Query(None, description="Filter by read status: read, unread"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type: campaign, adset, ad"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    """Get alerts with optional filtering"""
    try:
        alerts = await get_alerts_list(severity, status, entity_type, limit, skip)
        return {"status": "success", "data": alerts}
    except Exception as e:
        print(f"Error fetching alerts: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/{alert_id}", response_model=Dict[str, Any])
async def get_alert_detail(alert_id: str):
    """Get detailed information for a specific alert"""
    if not DB_AVAILABLE:
        # Return mock alert
        mock_alerts = generate_mock_alerts(1)
        if mock_alerts:
            mock_alerts[0]["id"] = alert_id
            return {"status": "success", "data": mock_alerts[0]}
        raise HTTPException(status_code=404, detail="Alert not found")
    
    try:
        alert = await Alert.get(PydanticObjectId(alert_id))
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {"status": "success", "data": {
            "id": str(alert.id),
            "entity_type": alert.entity_type,
            "entity_id": alert.entity_id,
            "entity_name": alert.entity_name or alert.entity_id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "title": alert.title,
            "description": alert.description,
            "kpi_name": alert.kpi_name,
            "change_percent": alert.change_percent,
            "root_cause": alert.root_cause,
            "recommendation": alert.recommendation,
            "is_read": alert.is_read,
            "created_at": alert.created_at.isoformat(),
            "updated_at": alert.updated_at.isoformat(),
        }}
    except Exception as e:
        print(f"Error fetching alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{alert_id}/read", response_model=Dict[str, Any])
async def mark_alert_as_read(alert_id: str):
    """Mark an alert as read"""
    if not DB_AVAILABLE:
        return {"status": "success", "message": "Alert marked as read (mock)"}
    
    try:
        alert = await Alert.get(PydanticObjectId(alert_id))
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        alert.is_read = True
        alert.updated_at = datetime.utcnow()
        await alert.save()
        
        return {"status": "success", "message": "Alert marked as read"}
    except Exception as e:
        print(f"Error marking alert as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate", response_model=Dict[str, Any])
async def generate_alerts():
    """Manually trigger alert generation (for debugging/admin)"""
    if not DB_AVAILABLE:
        return {"status": "success", "message": "Alert generation triggered (mock)", "generated": 5}
    
    try:
        generated = await detect_and_create_alerts()
        return {"status": "success", "message": f"Generated {generated} alerts", "generated": generated}
    except Exception as e:
        print(f"Error generating alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/summary", response_model=Dict[str, Any])
async def get_alert_stats():
    """Get alert statistics (counts by severity, unread count)"""
    if not DB_AVAILABLE:
        return {"status": "success", "data": {
            "total": 12,
            "unread": 5,
            "by_severity": {"HIGH": 3, "MEDIUM": 5, "LOW": 4},
            "by_entity_type": {"campaign": 8, "adset": 3, "ad": 1},
        }}
    
    try:
        total = await Alert.find().count()
        unread = await Alert.find({"is_read": False}).count()
        
        # Count by severity
        high = await Alert.find({"severity": "HIGH"}).count()
        medium = await Alert.find({"severity": "MEDIUM"}).count()
        low = await Alert.find({"severity": "LOW"}).count()
        
        # Count by entity type
        campaign = await Alert.find({"entity_type": "campaign"}).count()
        adset = await Alert.find({"entity_type": "adset"}).count()
        ad = await Alert.find({"entity_type": "ad"}).count()
        
        return {"status": "success", "data": {
            "total": total,
            "unread": unread,
            "by_severity": {"HIGH": high, "MEDIUM": medium, "LOW": low},
            "by_entity_type": {"campaign": campaign, "adset": adset, "ad": ad},
        }}
    except Exception as e:
        print(f"Error fetching alert stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Detection Engine ─────────────────────────────────────────────────────────────

async def detect_and_create_alerts() -> int:
    """Detect KPI anomalies and create alerts"""
    if not DB_AVAILABLE:
        return 0
    
    generated = 0
    
    try:
        # Get recent metrics (last 7 days)
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=7)
        
        # Fetch campaigns with metrics
        campaigns = await Campaign.find().to_list()
        
        for campaign in campaigns:
            # Get metrics for this campaign
            metrics = await Metric.find({
                "entity_type": "campaign",
                "entity_id": campaign.id,
                "date": {"$gte": start_date, "$lte": end_date}
            }).to_list()
            
            if len(metrics) < 2:
                continue
            
            # Calculate average ROAS for last 7 days vs previous 7 days
            recent_days = 3
            if len(metrics) >= recent_days + 7:
                recent_metrics = metrics[-recent_days:]
                previous_metrics = metrics[-recent_days-7:-recent_days]
                
                recent_roas = sum(m.roas or 0 for m in recent_metrics if m.roas) / recent_days
                previous_roas = sum(m.roas or 0 for m in previous_metrics if m.roas) / 7
                
                if previous_roas > 0:
                    change = (recent_roas - previous_roas) / previous_roas * 100
                    
                    # Create alert if significant drop
                    if change < -20:  # 20% drop threshold
                        severity = "HIGH" if change < -30 else "MEDIUM" if change < -20 else "LOW"
                        
                        alert = Alert(
                            entity_type="campaign",
                            entity_id=campaign.id,
                            entity_name=campaign.name,
                            alert_type="KPI_DROP",
                            severity=severity,
                            title=f"ROAS Drop in {campaign.name}",
                            description=f"ROAS decreased by {abs(change):.1f}% over the last {recent_days} days compared to previous period.",
                            kpi_name="ROAS",
                            change_percent=change,
                            root_cause="Possible causes: increased CPC, lower conversion rate, or audience fatigue.",
                            recommendation="Review targeting, adjust bids, test new creatives.",
                            is_read=False,
                        )
                        await alert.save()
                        generated += 1
        
        # Check for CPC spikes
        for campaign in campaigns:
            metrics = await Metric.find({
                "entity_type": "campaign",
                "entity_id": campaign.id,
                "date": {"$gte": start_date, "$lte": end_date}
            }).to_list()
            
            if len(metrics) < 5:
                continue
            
            # Calculate average CPC for last 2 days vs previous 5 days
            recent_cpc = sum(m.cpc or 0 for m in metrics[-2:] if m.cpc) / 2
            previous_cpc = sum(m.cpc or 0 for m in metrics[-7:-2] if m.cpc) / 5
            
            if previous_cpc > 0:
                change = (recent_cpc - previous_cpc) / previous_cpc * 100
                if change > 30:  # 30% increase threshold
                    severity = "HIGH" if change > 50 else "MEDIUM" if change > 30 else "LOW"
                    
                    alert = Alert(
                        entity_type="campaign",
                        entity_id=campaign.id,
                        entity_name=campaign.name,
                        alert_type="SPIKE",
                        severity=severity,
                        title=f"CPC Spike in {campaign.name}",
                        description=f"CPC increased by {change:.1f}% over the last 2 days compared to previous period.",
                        kpi_name="CPC",
                        change_percent=change,
                        root_cause="Possible causes: increased competition, bid adjustments, or targeting changes.",
                        recommendation="Review bids, check competitor activity, adjust targeting.",
                        is_read=False,
                    )
                    await alert.save()
                    generated += 1
        
        return generated
    
    except Exception as e:
        print(f"Error in detection engine: {e}")
        return generated


# ── Mock data for development ───────────────────────────────────────────────────

def generate_mock_alerts(count: int = 10) -> List[Dict[str, Any]]:
    """Generate realistic mock alerts for development"""
    entities = [
        {"type": "campaign", "id": "camp_123", "name": "Summer Sale 2024"},
        {"type": "campaign", "id": "camp_456", "name": "Brand Awareness Q3"},
        {"type": "adset", "id": "adset_789", "name": "Mobile Users"},
        {"type": "ad", "id": "ad_101", "name": "Video Ad - Product Demo"},
    ]
    
    alert_types = ["KPI_DROP", "ANOMALY", "SPIKE"]
    severities = ["HIGH", "MEDIUM", "LOW"]
    kpis = ["ROAS", "CPC", "CTR", "Conversion Rate", "Revenue"]
    
    alerts = []
    for i in range(count):
        entity = random.choice(entities)
        days_ago = random.randint(0, 7)
        created_at = datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))
        
        change = random.uniform(-50, 50)
        severity = "HIGH" if abs(change) > 40 else "MEDIUM" if abs(change) > 20 else "LOW"
        
        if change < 0:
            alert_type = "KPI_DROP"
            title = f"{kpis[0]} Drop in {entity['name']}"
            desc = f"{kpis[0]} decreased by {abs(change):.1f}% compared to previous period."
        else:
            alert_type = "SPIKE"
            title = f"{kpis[1]} Spike in {entity['name']}"
            desc = f"{kpis[1]} increased by {change:.1f}% compared to previous period."
        
        alerts.append({
            "id": f"alert_{i+1}",
            "entity_type": entity["type"],
            "entity_id": entity["id"],
            "entity_name": entity["name"],
            "alert_type": alert_type,
            "severity": severity,
            "title": title,
            "description": desc,
            "kpi_name": random.choice(kpis),
            "change_percent": change,
            "root_cause": random.choice([
                "Increased competition in the market.",
                "Audience fatigue with current creatives.",
                "Seasonal trends affecting performance.",
                "Technical issues with tracking or landing pages.",
            ]),
            "recommendation": random.choice([
                "Test new creatives to refresh audience engagement.",
                "Adjust bids to maintain competitive positioning.",
                "Expand targeting to new audience segments.",
                "Review landing page experience for conversion optimization.",
            ]),
            "is_read": random.choice([True, False]),
            "created_at": created_at.isoformat(),
            "updated_at": (created_at + timedelta(hours=random.randint(1, 24))).isoformat(),
        })
    
    # Sort by created_at descending
    alerts.sort(key=lambda x: x["created_at"], reverse=True)
    return alerts