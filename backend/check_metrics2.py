#!/usr/bin/env python3
import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from dotenv import load_dotenv
load_dotenv()

from app.db import init_database, close_database
from app.db.models import Campaign, Metric
from datetime import date, timedelta

async def check():
    await init_database()
    
    # Get all campaigns
    campaigns = await Campaign.find().to_list()
    print(f"Campaigns in DB: {len(campaigns)}")
    
    # Define date range (last 30 days)
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    print(f"Date range: {start_date} to {end_date}")
    
    for c in campaigns:
        metrics = await Metric.find({
            "entity_type": "campaign",
            "entity_id": c.id,
            "date": {"$gte": start_date, "$lte": end_date}
        }).to_list()
        print(f"Campaign {c.id}: {len(metrics)} metrics")
        if metrics:
            spend = sum(float(m.spend) for m in metrics)
            revenue = sum(float(m.revenue) for m in metrics)
            impressions = sum(m.impressions for m in metrics)
            clicks = sum(m.clicks for m in metrics)
            conversions = sum(m.conversions for m in metrics)
            print(f"  spend={spend}, revenue={revenue}, impressions={impressions}, clicks={clicks}, conversions={conversions}")
    
    await close_database()

if __name__ == "__main__":
    asyncio.run(check())