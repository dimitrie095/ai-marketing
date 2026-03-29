"""
Data Seeder Service
Generates and persists realistic demo metric data for existing campaigns
"""

import random
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from app.db.models import Metric, Campaign, AdSet, Ad, AudienceDemographic


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


async def seed_demographics_for_campaign(campaign_id: str) -> bool:
    """
    Generate and upsert realistic audience demographic data for a campaign.
    Returns True if a new record was created/updated.
    """
    existing = await AudienceDemographic.find_one(
        AudienceDemographic.campaign_id == campaign_id
    )

    # Randomised but realistic age distribution (sum = 100)
    age_raw = [
        random.uniform(10, 22),   # 18-24
        random.uniform(25, 38),   # 25-34  (prime)
        random.uniform(18, 28),   # 35-44
        random.uniform(10, 18),   # 45-54
        random.uniform(4, 12),    # 55+
    ]
    total_age = sum(age_raw)
    a18, a25, a35, a45, a55 = [round(v / total_age * 100, 1) for v in age_raw]

    # Gender split
    male_pct = round(random.uniform(38, 62), 1)
    female_pct = round(100 - male_pct - random.uniform(1, 4), 1)
    unknown_pct = round(100 - male_pct - female_pct, 1)

    # Device split
    mobile_pct = round(random.uniform(52, 72), 1)
    desktop_pct = round(random.uniform(22, 38), 1)
    tablet_pct = round(100 - mobile_pct - desktop_pct, 1)

    # Top 5 German cities/regions
    cities = [
        "Berlin", "München", "Hamburg", "Frankfurt", "Köln",
        "Stuttgart", "Düsseldorf", "Leipzig", "Dortmund", "Essen",
        "Bremen", "Dresden", "Hannover", "Nürnberg", "Duisburg",
    ]
    selected_cities = random.sample(cities, 5)
    city_raw = sorted([random.uniform(8, 35) for _ in range(5)], reverse=True)
    total_c = sum(city_raw)
    top_locations = ",".join(
        f"{city}:{round(v / total_c * 100, 1)}"
        for city, v in zip(selected_cities, city_raw)
    )

    # Top 5 interest categories
    interests_pool = [
        "Mode & Fashion", "Elektronik & Gadgets", "Sport & Fitness",
        "Reisen & Tourismus", "Essen & Kochen", "Haushalt & Wohnen",
        "Beauty & Kosmetik", "Gesundheit & Wellness", "Gaming",
        "Automobil", "Finanzen & Investment", "Musik & Entertainment",
        "Nachhaltigkeit", "Familie & Kinder", "Bildung",
    ]
    selected_interests = random.sample(interests_pool, 5)
    int_raw = sorted([random.uniform(8, 35) for _ in range(5)], reverse=True)
    total_i = sum(int_raw)
    top_interests = ",".join(
        f"{interest}:{round(v / total_i * 100, 1)}"
        for interest, v in zip(selected_interests, int_raw)
    )

    demo_data = dict(
        campaign_id=campaign_id,
        age_18_24=Decimal(str(a18)),
        age_25_34=Decimal(str(a25)),
        age_35_44=Decimal(str(a35)),
        age_45_54=Decimal(str(a45)),
        age_55_plus=Decimal(str(a55)),
        gender_male=Decimal(str(male_pct)),
        gender_female=Decimal(str(female_pct)),
        gender_unknown=Decimal(str(unknown_pct)),
        device_mobile=Decimal(str(mobile_pct)),
        device_desktop=Decimal(str(desktop_pct)),
        device_tablet=Decimal(str(tablet_pct)),
        top_locations=top_locations,
        top_interests=top_interests,
        updated_at=datetime.utcnow(),
    )

    if existing:
        for k, v in demo_data.items():
            setattr(existing, k, v)
        await existing.save()
    else:
        await AudienceDemographic(**demo_data).insert()

    return True


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
        await seed_demographics_for_campaign(str(campaign.id))

    return {
        "campaigns_processed": len(campaigns),
        "records_created": total_created,
    }


async def has_metrics(days: int = 30) -> bool:
    """Return True if the metrics collection has recent data."""
    cutoff = date.today() - timedelta(days=days)
    count = await Metric.find(Metric.date >= cutoff).count()
    return count > 0
