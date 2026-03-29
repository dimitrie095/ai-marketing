#!/usr/bin/env python3
"""
Seed audience demographics for existing campaigns.
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime
from decimal import Decimal
import random

backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from dotenv import load_dotenv
load_dotenv()

from app.db import init_database, close_database
from app.db.models import Campaign, AudienceDemographic

async def seed_audience_demographics():
    await init_database()
    
    campaigns = await Campaign.find({}).to_list()
    print(f"Found {len(campaigns)} campaigns")
    
    # Delete existing demographics
    await AudienceDemographic.find({}).delete()
    print("Cleared existing audience demographics")
    
    for campaign in campaigns:
        # Generate random demographic percentages that sum to ~100
        age_18_24 = Decimal(random.randint(5, 20))
        age_25_34 = Decimal(random.randint(20, 35))
        age_35_44 = Decimal(random.randint(15, 30))
        age_45_54 = Decimal(random.randint(10, 25))
        age_55_plus = Decimal(100 - (age_18_24 + age_25_34 + age_35_44 + age_45_54))
        
        gender_male = Decimal(random.randint(40, 60))
        gender_female = Decimal(100 - gender_male)
        gender_unknown = Decimal(0)
        
        device_mobile = Decimal(random.randint(50, 70))
        device_desktop = Decimal(random.randint(20, 40))
        device_tablet = Decimal(100 - device_mobile - device_desktop)
        
        # Top locations (mock)
        top_locations = "Berlin:0.25,München:0.15,Hamburg:0.12,Köln:0.10,Frankfurt:0.08"
        top_interests = "Technology:0.30,Sports:0.25,Travel:0.20,Fashion:0.15,Cooking:0.10"
        
        demo = AudienceDemographic(
            campaign_id=campaign.id,
            age_18_24=age_18_24,
            age_25_34=age_25_34,
            age_35_44=age_35_44,
            age_45_54=age_45_54,
            age_55_plus=age_55_plus,
            gender_male=gender_male,
            gender_female=gender_female,
            gender_unknown=gender_unknown,
            device_mobile=device_mobile,
            device_desktop=device_desktop,
            device_tablet=device_tablet,
            top_locations=top_locations,
            top_interests=top_interests,
            updated_at=datetime.utcnow()
        )
        await demo.save()
        print(f"  Created demographics for campaign {campaign.id}")
    
    print(f"✅ Created {len(campaigns)} audience demographic records")
    await close_database()

if __name__ == "__main__":
    asyncio.run(seed_audience_demographics())