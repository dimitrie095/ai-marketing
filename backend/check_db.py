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

async def check():
    await init_database()
    
    campaigns = await Campaign.find().to_list()
    print(f"Campaigns in DB: {len(campaigns)}")
    for c in campaigns:
        print(f"  - {c.id}: {c.name}, status={c.status}")
        
    metrics = await Metric.find().to_list()
    print(f"Metrics in DB: {len(metrics)}")
    if metrics:
        # group by entity_type and entity_id
        from collections import defaultdict
        grouped = defaultdict(int)
        for m in metrics:
            key = f"{m.entity_type}:{m.entity_id}"
            grouped[key] += 1
        print(f"Metrics by entity: {dict(grouped)}")
    
    await close_database()

if __name__ == "__main__":
    asyncio.run(check())