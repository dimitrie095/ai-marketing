import asyncio
import sys
import os
sys.path.append('.')
from dotenv import load_dotenv
load_dotenv()
from app.db.session import init_database, close_database
from app.db.models import Campaign

async def main():
    await init_database()
    print("All campaigns:")
    campaigns = await Campaign.find_all().to_list()
    for c in campaigns:
        print(f"  id={c.id} name={c.name} _id={c.__dict__.get('_id')}")
    # Try find_one
    campaign = await Campaign.find_one({"id": "camp_012"})
    print(f"Find one result: {campaign}")
    await close_database()

if __name__ == "__main__":
    asyncio.run(main())