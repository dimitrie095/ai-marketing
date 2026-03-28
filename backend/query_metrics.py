import asyncio
import sys
sys.path.append('.')
from app.db.session import init_database, client
from app.db.models import Metric
from datetime import date

async def query():
    await init_database()
    if client is None:
        print("Client is None")
        return
    db = client.marketing_ai
    print("Metrics count:", await db.metrics.count_documents({}))
    # Get first few metrics
    metrics = await db.metrics.find({}).limit(5).to_list(length=5)
    for m in metrics:
        print(m)
    # Check date range
    print("\nDate range in metrics:")
    pipeline = [
        {"$group": {"_id": None, "min_date": {"$min": "$date"}, "max_date": {"$max": "$date"}}}
    ]
    result = await db.metrics.aggregate(pipeline).to_list(length=1)
    print(result)
    # Query for campaign metrics
    campaign_metrics = await db.metrics.find({"entity_type": "campaign"}).limit(5).to_list(length=5)
    print(f"\nCampaign metrics count: {await db.metrics.count_documents({'entity_type': 'campaign'})}")
    for m in campaign_metrics:
        print(m['date'], m['entity_id'], m['spend'], m['revenue'])
    # Check for date 2025-01-01
    from bson import ObjectId
    import datetime
    query = {"entity_type": "campaign", "date": datetime.date(2025, 1, 1)}
    print("\nMetrics for 2025-01-01:", await db.metrics.count_documents(query))
    if await db.metrics.count_documents(query) > 0:
        m = await db.metrics.find_one(query)
        print(m)

if __name__ == "__main__":
    asyncio.run(query())