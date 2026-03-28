"""
Admin API Endpoints
Utility endpoints for data management and seeding
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

router = APIRouter(prefix="/admin", tags=["Admin"])

try:
    from app.services.data_seeder import seed_all_campaigns, has_metrics
    from app.db.models import Metric, Campaign
    SEEDER_AVAILABLE = True
except ImportError:
    SEEDER_AVAILABLE = False


@router.post("/seed-metrics")
async def seed_metrics(days: int = 180):
    """
    Generate and persist realistic demo metric data for all campaigns.
    Safe to call multiple times — skips campaigns that already have recent data.
    """
    if not SEEDER_AVAILABLE:
        raise HTTPException(status_code=503, detail="Seeder not available (DB not connected)")

    result = await seed_all_campaigns(days=days)
    return {
        "status": "success",
        "message": f"Seeding complete: {result['records_created']} records created for {result['campaigns_processed']} campaigns",
        **result,
    }


@router.delete("/metrics")
async def delete_all_metrics():
    """
    Delete all metric records (useful for re-seeding with fresh data).
    """
    if not SEEDER_AVAILABLE:
        raise HTTPException(status_code=503, detail="DB not available")

    result = await Metric.find().delete()
    return {
        "status": "success",
        "message": f"All metric records deleted",
        "deleted_count": result.deleted_count if result else 0,
    }


@router.get("/status")
async def seeder_status():
    """Check seeder / data status."""
    if not SEEDER_AVAILABLE:
        return {"db_available": False, "has_metrics": False, "campaign_count": 0, "metric_count": 0}

    campaign_count = await Campaign.find().count()
    metric_count = await Metric.find().count()
    recent = await has_metrics(days=30)

    return {
        "db_available": True,
        "has_recent_metrics": recent,
        "campaign_count": campaign_count,
        "metric_count": metric_count,
    }
