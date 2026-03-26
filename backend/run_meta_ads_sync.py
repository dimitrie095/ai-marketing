#!/usr/bin/env python3
"""
Meta Ads Sync Script
Manuelle Ausführung des ETL Prozesses
Phase 2: P-03 - Meta Ads ETL
"""

import asyncio
import sys
from pathlib import Path
from datetime import date, timedelta
import os

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from dotenv import load_dotenv
load_dotenv()

from app.db import init_database, close_database
from app.services.meta_ads_etl import MetaAdsETL


async def sync_all():
    """Führt vollständigen Sync durch"""
    print("=" * 60)
    print("Meta Ads ETL - Vollständiger Sync")
    print("=" * 60)
    print()
    
    # Initialisiere ETL
    etl = MetaAdsETL()
    
    # Lese API Keys aus Umgebung
    access_token = os.getenv("META_ACCESS_TOKEN")
    app_id = os.getenv("META_APP_ID")
    ad_account_id = os.getenv("META_AD_ACCOUNT_ID")
    
    await etl.initialize(
        access_token=access_token,
        app_id=app_id,
        ad_account_id=ad_account_id
    )
    
    # 1. Sync Kampagnen
    print("🔄 1. Sync Kampagnen...")
    result = await etl.sync_campaigns()
    print(f"   ✅ {result['synced']} Kampagnen gespeichert (Mode: {result['mode']})")
    print()
    
    # 2. Sync AdSets
    from app.db.models import Campaign
    campaigns = await Campaign.find().to_list()
    campaign_ids = [c.id for c in campaigns]
    
    print("🔄 2. Sync AdSets...")
    result = await etl.sync_adsets(campaign_ids)
    print(f"   ✅ {result['synced']} AdSets gespeichert")
    print()
    
    # 3. Sync Ads
    from app.db.models import AdSet
    adsets = await AdSet.find().to_list()
    adset_ids = [a.id for a in adsets]
    
    print("🔄 3. Sync Ads...")
    result = await etl.sync_ads(adset_ids)
    print(f"   ✅ {result['synced']} Ads gespeichert")
    print()
    
    # 4. Sync Insights (letzte 30 Tage)
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    
    print(f"🔄 4. Sync Insights ({start_date} bis {end_date})...")
    
    # Campaign Insights
    print("   📊 Campaign Insights...")
    result = await etl.sync_insights("campaign", campaign_ids, start_date, end_date)
    print(f"      ✅ {result['synced']} Metriken gespeichert")
    
    # AdSet Insights
    print("   📊 AdSet Insights...")
    result = await etl.sync_insights("adset", adset_ids, start_date, end_date)
    print(f"      ✅ {result['synced']} Metriken gespeichert")
    
    # Ad Insights
    from app.db.models import Ad
    ads = await Ad.find().to_list()
    ad_ids = [a.id for a in ads]
    
    print("   📊 Ad Insights...")
    result = await etl.sync_insights("ad", ad_ids, start_date, end_date)
    print(f"      ✅ {result['synced']} Metriken gespeichert")
    
    print()
    print("=" * 60)
    print("🎉 Sync abgeschlossen!")
    print("=" * 60)


async def main():
    """Hauptfunktion"""
    # Initialisiere Datenbank
    print("🔌 Initialisiere Datenbank...")
    await init_database()
    print()
    
    try:
        await sync_all()
    finally:
        # Schließe Datenbank
        await close_database()
        print()
        print("💡 Nächste Schritte:")
        print("   1. Teste die KPI API: /api/v1/kpi/dashboard/summary?start_date=...")
        print("   2. Öffne die Docs: http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(main())