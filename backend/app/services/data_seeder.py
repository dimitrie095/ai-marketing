"""
Data Seeder Service
Generates and persists realistic demo metric data for existing campaigns
"""

import random
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from app.db.models import Metric, Campaign, AdSet, Ad


async def seed_metrics_for_campaign(
    campaign_id: str,
    days: int = 90,
    base_spend: float = 150.0,
    base_roas: float = 2.8,
) -> int:
    """
    Generate and save realistic daily metrics for a campaign.
    Returns the number of records created.
    """
    today = date.today()
    start = today - timedelta(days=days - 1)

    # Check if metrics already exist for this campaign in this range
    existing = await Metric.find(
        Metric.entity_type == "campaign",
        Metric.entity_id == campaign_id,
        Metric.date >= start,
        Metric.date <= today,
    ).count()

    if existing >= days * 0.8:
        # Already seeded — skip
        return 0

    created = 0
    current = start

    # Simulate a realistic spend curve with weekly seasonality
    while current <= today:
        day_of_week = current.weekday()  # 0=Mon, 6=Sun
        seasonality = 1.0 + 0.25 * (day_of_week in (4, 5))  # Fri/Sat boost

        # Add some trend (slight growth over time)
        days_elapsed = (current - start).days
        trend = 1.0 + 0.003 * days_elapsed

        # Core spend with noise
        spend = round(base_spend * seasonality * trend * random.uniform(0.7, 1.4), 2)
        revenue = round(spend * base_roas * random.uniform(0.8, 1.3), 2)

        impressions = int(spend * random.uniform(18, 35))
        ctr = random.uniform(0.018, 0.055)  # 1.8% – 5.5%
        clicks = max(1, int(impressions * ctr))
        cvr = random.uniform(0.03, 0.12)   # 3% – 12%
        conversions = max(0, int(clicks * cvr))

        reach = int(impressions * random.uniform(0.55, 0.75))
        engagement = int(impressions * random.uniform(0.01, 0.04))
        video_views = int(impressions * random.uniform(0.05, 0.15))
        vp50 = int(video_views * random.uniform(0.6, 0.8))
        vp75 = int(vp50 * random.uniform(0.6, 0.8))
        vp95 = int(vp75 * random.uniform(0.5, 0.75))
        vp100 = int(vp95 * random.uniform(0.4, 0.7))

        metric = Metric(
            date=current,
            entity_type="campaign",
            entity_id=campaign_id,
            spend=Decimal(str(spend)),
            impressions=impressions,
            clicks=clicks,
            conversions=conversions,
            revenue=Decimal(str(revenue)),
            reach=reach,
            frequency=Decimal(str(round(impressions / reach if reach else 1.0, 2))),
            engagement=engagement,
            video_views=video_views,
            video_p50_watched_actions=vp50,
            video_p75_watched_actions=vp75,
            video_p95_watched_actions=vp95,
            video_p100_watched_actions=vp100,
        )
        await metric.insert()
        created += 1
        current += timedelta(days=1)

    return created


async def seed_all_campaigns(days: int = 90) -> dict:
    """
    Seed metrics for all campaigns in the database.
    Returns a summary dict.
    """
    campaigns = await Campaign.find().to_list()
    if not campaigns:
        return {"campaigns_processed": 0, "records_created": 0}

    total_created = 0
    for campaign in campaigns:
        # Vary the base spend per campaign so they look distinct
        base_spend = random.uniform(80, 400)
        base_roas = random.uniform(1.8, 4.2)
        created = await seed_metrics_for_campaign(
            campaign_id=str(campaign.id),
            days=days,
            base_spend=base_spend,
            base_roas=base_roas,
        )
        total_created += created

    return {
        "campaigns_processed": len(campaigns),
        "records_created": total_created,
    }


async def has_metrics(days: int = 30) -> bool:
    """Return True if the metrics collection has recent data."""
    cutoff = date.today() - timedelta(days=days)
    count = await Metric.find(Metric.date >= cutoff).count()
    return count > 0
