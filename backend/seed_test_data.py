#!/usr/bin/env python3
"""
Test Data Seeder
Erstellt Beispiel-Daten für KPI Testing
Phase 2: P-01 - Testdaten für KPI Engine
"""

import asyncio
import sys
from pathlib import Path
from datetime import date, datetime, timedelta
from decimal import Decimal
import random

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from dotenv import load_dotenv
load_dotenv()

from app.db import init_database, close_database
from app.db.models import Campaign, AdSet, Ad, Metric


async def seed_campaigns():
    """Erstellt Beispiel-Kampagnen"""
    campaigns = []
    
    for i in range(1, 6):
        campaign = Campaign(
            id=f"camp_{i}",
            name=f"Kampagne {i} - Q1 2025",
            status="ACTIVE",
            objective="CONVERSIONS",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        campaigns.append(campaign)
    
    for campaign in campaigns:
        await campaign.save()
    
    print(f"✅ {len(campaigns)} Kampagnen erstellt")
    return campaigns


async def seed_adsets(campaigns):
    """Erstellt Beispiel-AdSets"""
    adsets = []
    
    for campaign in campaigns:
        for i in range(1, 4):
            adset = AdSet(
                id=f"adset_{campaign.id}_{i}",
                campaign_id=campaign.id,
                name=f"{campaign.name} - AdSet {i}",
                status="ACTIVE",
                daily_budget=Decimal("50.00"),
                optimization_goal="CONVERSIONS",
                billing_event="IMPRESSIONS",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            adsets.append(adset)
    
    for adset in adsets:
        await adset.save()
    
    print(f"✅ {len(adsets)} AdSets erstellt")
    return adsets


async def seed_ads(adsets):
    """Erstellt Beispiel-Ads"""
    ads = []
    
    for adset in adsets:
        for i in range(1, 4):
            ad = Ad(
                id=f"ad_{adset.id}_{i}",
                ad_set_id=adset.id,
                name=f"{adset.name} - Ad {i}",
                status="ACTIVE",
                creative_type="IMAGE",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            ads.append(ad)
    
    for ad in ads:
        await ad.save()
    
    print(f"✅ {len(ads)} Ads erstellt")
    return ads


async def seed_metrics(campaigns, adsets, ads):
    """Erstellt Beispiel-Metriken für 30 Tage"""
    metrics = []
    
    # Letzte 30 Tage
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    
    # Für jede Entität (campaign, adset, ad)
    for current_date in [start_date + timedelta(days=i) for i in range(31)]:
        
        # Kampagnen-Metriken
        for campaign in campaigns:
            impressions = random.randint(1000, 10000)
            clicks = int(impressions * random.uniform(0.01, 0.05))
            conversions = int(clicks * random.uniform(0.03, 0.15))
            spend = Decimal(str(random.uniform(20, 200)))
            revenue = spend * Decimal(str(random.uniform(1.5, 4.0)))
            
            metric = Metric(
                date=current_date,
                entity_type="campaign",
                entity_id=campaign.id,
                spend=spend,
                impressions=impressions,
                clicks=clicks,
                conversions=conversions,
                revenue=revenue,
                reach=int(impressions * 0.7),
                frequency=Decimal(str(random.uniform(1.0, 4.0))),
                engagement=int(impressions * random.uniform(0.001, 0.01)),
                video_views=random.randint(0, 500),
                video_p50_watched_actions=random.randint(0, 300),
                video_p75_watched_actions=random.randint(0, 200),
                video_p95_watched_actions=random.randint(0, 100),
                video_p100_watched_actions=random.randint(0, 50),
                created_at=datetime.utcnow()
            )
            metrics.append(metric)
        
        # AdSet-Metriken
        for adset in adsets:
            impressions = random.randint(400, 4000)
            clicks = int(impressions * random.uniform(0.01, 0.05))
            conversions = int(clicks * random.uniform(0.03, 0.15))
            spend = Decimal(str(random.uniform(8, 80)))
            revenue = spend * Decimal(str(random.uniform(1.5, 4.0)))
            
            metric = Metric(
                date=current_date,
                entity_type="adset",
                entity_id=adset.id,
                spend=spend,
                impressions=impressions,
                clicks=clicks,
                conversions=conversions,
                revenue=revenue,
                reach=int(impressions * 0.7),
                frequency=Decimal(str(random.uniform(1.0, 4.0))),
                engagement=int(impressions * random.uniform(0.001, 0.01)),
                video_views=random.randint(0, 200),
                video_p50_watched_actions=random.randint(0, 120),
                video_p75_watched_actions=random.randint(0, 80),
                video_p95_watched_actions=random.randint(0, 40),
                video_p100_watched_actions=random.randint(0, 20),
                created_at=datetime.utcnow()
            )
            metrics.append(metric)
        
        # Ad-Metriken
        for ad in ads:
            impressions = random.randint(150, 1500)
            clicks = int(impressions * random.uniform(0.01, 0.05))
            conversions = int(clicks * random.uniform(0.03, 0.15))
            spend = Decimal(str(random.uniform(3, 30)))
            revenue = spend * Decimal(str(random.uniform(1.5, 4.0)))
            
            metric = Metric(
                date=current_date,
                entity_type="ad",
                entity_id=ad.id,
                spend=spend,
                impressions=impressions,
                clicks=clicks,
                conversions=conversions,
                revenue=revenue,
                reach=int(impressions * 0.7),
                frequency=Decimal(str(random.uniform(1.0, 4.0))),
                engagement=int(impressions * random.uniform(0.001, 0.01)),
                video_views=random.randint(0, 100),
                video_p50_watched_actions=random.randint(0, 60),
                video_p75_watched_actions=random.randint(0, 40),
                video_p95_watched_actions=random.randint(0, 20),
                video_p100_watched_actions=random.randint(0, 10),
                created_at=datetime.utcnow()
            )
            metrics.append(metric)
    
    # Speichere alle Metriken
    for metric in metrics:
        await metric.save()
    
    print(f"✅ {len(metrics)} Metriken erstellt (30 Tage × Entitäten)")
    return metrics


async def main():
    """Hauptfunktion"""
    print("=" * 60)
    print("MongoDB Test Data Seeder - Phase 2: P-01")
    print("=" * 60)
    print()
    
    # Initialisiere Datenbank
    print("🔌 Initialisiere Datenbank-Verbindung...")
    await init_database()
    print()
    
    # Lösche alte Daten
    print("🗑️  Lösche alte Testdaten...")
    from app.db import Campaign, AdSet, Ad, Metric
    await Campaign.delete_all()
    await AdSet.delete_all()
    await Ad.delete_all()
    await Metric.delete_all()
    print("✅ Alte Daten gelöscht")
    print()
    
    # Erstelle neue Daten
    print("🌱 Erstelle neue Testdaten...\n")
    
    campaigns = await seed_campaigns()
    adsets = await seed_adsets(campaigns)
    ads = await seed_ads(adsets)
    metrics = await seed_metrics(campaigns, adsets, ads)
    
    print()
    print("=" * 60)
    print("🎉 Testdaten erfolgreich erstellt!")
    print("=" * 60)
    print()
    
    # Teste KPI Engine
    print("🔍 Teste KPI Engine...")
    from app.processing.kpi_engine import KPIEngine
    
    # Teste einzelne Metrik
    test_metric = metrics[0]
    kpi_result = await KPIEngine.calculate_from_metric(test_metric)
    print(f"✅ Einzelne Metrik: CTR={kpi_result.ctr}%, CPC=${kpi_result.cpc}")
    
    # Teste Zeitraum
    start_date = date.today() - timedelta(days=7)
    end_date = date.today()
    kpi_result = await KPIEngine.calculate_for_period(
        entity_type="campaign",
        entity_id=campaigns[0].id,
        start_date=start_date,
        end_date=end_date
    )
    print(f"✅ 7-Tage Zeitraum: CTR={kpi_result.ctr}%, ROAS={kpi_result.roas}")
    
    print()
    print("💡 Nächste Schritte:")
    print("   1. Starte den Server: uvicorn app.main:app --reload")
    print("   2. Teste die KPI API: /api/v1/kpi/entity?entity_type=campaign&entity_id=camp_1&start_date=...")
    print("   3. Öffne die Docs: http://localhost:8000/docs")
    print()
    
    # Schließe Datenbank
    await close_database()


if __name__ == "__main__":
    asyncio.run(main())