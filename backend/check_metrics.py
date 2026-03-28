#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import init_database, close_database
from app.db.models import Metric, Campaign
from datetime import date

async def main():
    await init_database()
    
    # Get all campaigns
    campaigns = await Campaign.find().to_list()
    print(f"Found {len(campaigns)} campaigns")
    for c in campaigns:
        print(f"Campaign {c.id}: {c.name}")
        # Get metrics for this campaign
        metrics = await Metric.find({
            "entity_type": "campaign",
            "entity_id": c.id,
            "date": {"$gte": date(2025, 1, 1), "$lte": date(2025, 3, 31)}
        }).to_list()
        print(f"  Found {len(metrics)} metrics")
        if metrics:
            total_spend = sum(float(m.spend) for m in metrics)
            total_revenue = sum(float(m.revenue) for m in metrics)
            print(f"  Total spend: {total_spend}, revenue: {total_revenue}")
    
    await close_database()

if __name__ == "__main__":
    asyncio.run(main())