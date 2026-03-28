#!/usr/bin/env python3
import asyncio
import sys
from pathlib import Path
from datetime import date, timedelta

backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from dotenv import load_dotenv
load_dotenv()

from app.db import init_database, close_database
from app.db.models import Metric

async def adjust():
    await init_database()
    
    # Get all metrics
    metrics = await Metric.find().to_list()
    print(f"Total metrics: {len(metrics)}")
    
    updated = 0
    for m in metrics:
        # Subtract one year
        old_date = m.date
        try:
            new_date = date(old_date.year - 1, old_date.month, old_date.day)
        except ValueError:
            # Handle Feb 29
            new_date = date(old_date.year - 1, old_date.month, 28)
        m.date = new_date
        await m.save()
        updated += 1
        if updated % 100 == 0:
            print(f"Updated {updated} metrics")
    
    print(f"✅ Updated {updated} metrics to previous year")
    await close_database()

if __name__ == "__main__":
    asyncio.run(adjust())