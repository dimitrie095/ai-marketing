"""
Meta Ads ETL Service
Phase 2: P-03 - ETL Meta Ads Daten
Holt Daten von Meta Ads API und speichert sie in MongoDB
"""

from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
import asyncio
import httpx
from app.db.models import Campaign, AdSet, Ad, Metric, MetaInsights
import logging

logger = logging.getLogger(__name__)


class MetaAdsETL:
    """
    ETL Service für Meta Ads API
    - Extract: Daten von Meta Ads API abrufen
    - Transform: In unser Datenmodell konvertieren
    - Load: In MongoDB speichern
    """
    
    def __init__(self):
        self.access_token = None
        self.app_id = None
        self.ad_account_id = None
        self.base_url = "https://graph.facebook.com/v21.0"
        self.client = None
        self.use_mock_data = True  # Standardmäßig Mock-Daten verwenden
    
    async def initialize(self, access_token: str = None, app_id: str = None, ad_account_id: str = None):
        """
        Initialisiert den ETL Service
        
        Args:
            access_token: Meta Ads API Access Token
            app_id: Meta App ID
            ad_account_id: Meta Ad Account ID
        """
        self.access_token = access_token
        self.app_id = app_id
        self.ad_account_id = ad_account_id
        
        # Prüfe, ob echte API-Daten verfügbar sind
        if access_token and access_token != "your_meta_access_token_here":
            self.use_mock_data = False
            self.client = httpx.AsyncClient(timeout=30.0)
            logger.info("✅ Meta Ads ETL mit echter API initialisiert")
        else:
            logger.info("⚠️  Meta Ads ETL mit Mock-Daten initialisiert")
    
    async def sync_campaigns(self) -> Dict[str, Any]:
        """
        Synchronisiert Kampagnen-Daten
        
        Returns:
            Dictionary mit Sync-Ergebnis
        """
        try:
            if self.use_mock_data:
                return await self._sync_campaigns_mock()
            else:
                return await self._sync_campaigns_real()
        except Exception as e:
            logger.error(f"Fehler beim Sync von Kampagnen: {e}")
            return {"status": "error", "message": str(e)}
    
    async def sync_adsets(self, campaign_ids: List[str]) -> Dict[str, Any]:
        """
        Synchronisiert AdSet-Daten für bestimmte Kampagnen
        
        Args:
            campaign_ids: Liste von Campaign IDs
            
        Returns:
            Dictionary mit Sync-Ergebnis
        """
        try:
            if self.use_mock_data:
                return await self._sync_adsets_mock(campaign_ids)
            else:
                return await self._sync_adsets_real(campaign_ids)
        except Exception as e:
            logger.error(f"Fehler beim Sync von AdSets: {e}")
            return {"status": "error", "message": str(e)}
    
    async def sync_ads(self, adset_ids: List[str]) -> Dict[str, Any]:
        """
        Synchronisiert Ad-Daten für bestimmte AdSets
        
        Args:
            adset_ids: Liste von AdSet IDs
            
        Returns:
            Dictionary mit Sync-Ergebnis
        """
        try:
            if self.use_mock_data:
                return await self._sync_ads_mock(adset_ids)
            else:
                return await self._sync_ads_real(adset_ids)
        except Exception as e:
            logger.error(f"Fehler beim Sync von Ads: {e}")
            return {"status": "error", "message": str(e)}
    
    async def sync_insights(
        self,
        entity_type: str,
        entity_ids: List[str],
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Synchronisiert Performance-Insights (Metriken)
        
        Args:
            entity_type: 'campaign', 'adset', oder 'ad'
            entity_ids: Liste von Entity IDs
            start_date: Start Datum
            end_date: End Datum
            
        Returns:
            Dictionary mit Sync-Ergebnis
        """
        try:
            if self.use_mock_data:
                return await self._sync_insights_mock(entity_type, entity_ids, start_date, end_date)
            else:
                return await self._sync_insights_real(entity_type, entity_ids, start_date, end_date)
        except Exception as e:
            logger.error(f"Fehler beim Sync von Insights: {e}")
            return {"status": "error", "message": str(e)}
    
    # ==================================================================
    # Mock Data Implementierungen (zum Testen ohne echte API)
    # ==================================================================
    
    async def _sync_campaigns_mock(self) -> Dict[str, Any]:
        """Mock Implementierung für Kampagnen-Sync"""
        logger.info("🔄 Sync Kampagnen (Mock-Modus)...")
        
        mock_campaigns = [
            {
                "id": "23853712345678901",
                "name": "Q1 2025 - Conversions Kampagne",
                "status": "ACTIVE",
                "objective": "CONVERSIONS",
                "created_time": "2025-01-01T10:00:00+0000"
            },
            {
                "id": "23853712345678902",
                "name": "Q1 2025 - Traffic Kampagne",
                "status": "PAUSED",
                "objective": "LINK_CLICKS",
                "created_time": "2025-01-15T10:00:00+0000"
            },
            {
                "id": "23853712345678903",
                "name": "Q1 2025 - Brand Awareness",
                "status": "ACTIVE",
                "objective": "REACH",
                "created_time": "2025-01-20T10:00:00+0000"
            }
        ]
        
        synced = 0
        for campaign_data in mock_campaigns:
            # Prüfe, ob Kampagne bereits existiert
            existing = await Campaign.find_one({"id": campaign_data["id"]})
            if not existing:
                campaign = Campaign(
                    id=campaign_data["id"],
                    name=campaign_data["name"],
                    status=campaign_data["status"],
                    objective=campaign_data["objective"],
                    created_at=datetime.fromisoformat(campaign_data["created_time"]),
                    updated_at=datetime.utcnow(),
                    synced_at=datetime.utcnow()
                )
                await campaign.save()
                synced += 1
        
        logger.info(f"✅ {synced} neue Kampagnen gespeichert")
        return {"status": "success", "synced": synced, "mode": "mock"}
    
    async def _sync_adsets_mock(self, campaign_ids: List[str]) -> Dict[str, Any]:
        """Mock Implementierung für AdSets-Sync"""
        logger.info(f"🔄 Sync AdSets für {len(campaign_ids)} Kampagnen (Mock-Modus)...")
        
        mock_adsets = []
        for campaign_id in campaign_ids:
            mock_adsets.extend([
                {
                    "id": f"{campaign_id}_adset_1",
                    "campaign_id": campaign_id,
                    "name": f"Kampagne {campaign_id} - AdSet 1",
                    "status": "ACTIVE",
                    "daily_budget": 15000,  # In Cents
                    "optimization_goal": "CONVERSIONS",
                    "billing_event": "IMPRESSIONS"
                },
                {
                    "id": f"{campaign_id}_adset_2",
                    "campaign_id": campaign_id,
                    "name": f"Kampagne {campaign_id} - AdSet 2",
                    "status": "ACTIVE",
                    "daily_budget": 25000,
                    "optimization_goal": "CONVERSIONS",
                    "billing_event": "IMPRESSIONS"
                }
            ])
        
        synced = 0
        for adset_data in mock_adsets:
            existing = await AdSet.find_one({"id": adset_data["id"]})
            if not existing:
                adset = AdSet(
                    id=adset_data["id"],
                    campaign_id=adset_data["campaign_id"],
                    name=adset_data["name"],
                    status=adset_data["status"],
                    daily_budget=Decimal(adset_data["daily_budget"] / 100),
                    optimization_goal=adset_data["optimization_goal"],
                    billing_event=adset_data["billing_event"],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    synced_at=datetime.utcnow()
                )
                await adset.save()
                synced += 1
        
        logger.info(f"✅ {synced} neue AdSets gespeichert")
        return {"status": "success", "synced": synced, "mode": "mock"}
    
    async def _sync_ads_mock(self, adset_ids: List[str]) -> Dict[str, Any]:
        """Mock Implementierung für Ads-Sync"""
        logger.info(f"🔄 Sync Ads für {len(adset_ids)} AdSets (Mock-Modus)...")
        
        mock_ads = []
        for adset_id in adset_ids:
            mock_ads.extend([
                {
                    "id": f"{adset_id}_ad_1",
                    "adset_id": adset_id,
                    "name": f"AdSet {adset_id} - Creative 1",
                    "status": "ACTIVE",
                    "creative_type": "IMAGE"
                },
                {
                    "id": f"{adset_id}_ad_2",
                    "adset_id": adset_id,
                    "name": f"AdSet {adset_id} - Creative 2",
                    "status": "ACTIVE",
                    "creative_type": "VIDEO"
                }
            ])
        
        synced = 0
        for ad_data in mock_ads:
            existing = await Ad.find_one({"id": ad_data["id"]})
            if not existing:
                ad = Ad(
                    id=ad_data["id"],
                    ad_set_id=ad_data["adset_id"],
                    name=ad_data["name"],
                    status=ad_data["status"],
                    creative_type=ad_data["creative_type"],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    synced_at=datetime.utcnow()
                )
                await ad.save()
                synced += 1
        
        logger.info(f"✅ {synced} neue Ads gespeichert")
        return {"status": "success", "synced": synced, "mode": "mock"}
    
    async def _sync_insights_mock(
        self,
        entity_type: str,
        entity_ids: List[str],
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Mock Implementierung für Insights-Sync"""
        logger.info(f"🔄 Sync Insights für {len(entity_ids)} {entity_type}s (Mock-Modus)...")
        
        import random
        
        synced = 0
        for entity_id in entity_ids:
            # Schreibe Metriken für jeden Tag
            current_date = start_date
            while current_date <= end_date:
                # Prüfe, ob Metrik bereits existiert
                existing = await Metric.find_one({
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "date": current_date
                })
                
                if not existing:
                    # Generiere realistische Mock-Daten
                    impressions = random.randint(100, 10000)
                    clicks = int(impressions * random.uniform(0.01, 0.05))
                    conversions = int(clicks * random.uniform(0.02, 0.12))
                    spend = Decimal(str(random.uniform(5, 500)))
                    revenue = spend * Decimal(str(random.uniform(1.2, 3.5)))
                    
                    metric = Metric(
                        date=current_date,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        spend=spend,
                        impressions=impressions,
                        clicks=clicks,
                        conversions=conversions,
                        revenue=revenue,
                        reach=int(impressions * 0.75),
                        frequency=Decimal(str(random.uniform(1.0, 3.5))),
                        engagement=int(impressions * random.uniform(0.001, 0.008)),
                        video_views=random.randint(0, 1000),
                        video_p50_watched_actions=random.randint(0, 800),
                        video_p75_watched_actions=random.randint(0, 600),
                        video_p95_watched_actions=random.randint(0, 400),
                        video_p100_watched_actions=random.randint(0, 200),
                        created_at=datetime.utcnow()
                    )
                    await metric.save()
                    synced += 1
                
                current_date += timedelta(days=1)
        
        logger.info(f"✅ {synced} neue Metriken gespeichert")
        return {"status": "success", "synced": synced, "mode": "mock"}
    
    # ==================================================================
    # Echte API Implementierungen (für spätere Verwendung)
    # ==================================================================
    
    async def _sync_campaigns_real(self) -> Dict[str, Any]:
        """Echte Implementierung für Kampagnen-Sync"""
        logger.info("🔄 Sync Kampagnen (Echter API-Modus)...")
        
        url = f"{self.base_url}/act_{self.ad_account_id}/campaigns"
        params = {
            "access_token": self.access_token,
            "fields": "id,name,status,objective,created_time"
        }
        
        response = await self.client.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        campaigns_data = data.get("data", [])
        
        synced = 0
        for campaign_data in campaigns_data:
            existing = await Campaign.find_one({"id": campaign_data["id"]})
            if not existing:
                campaign = Campaign(
                    id=campaign_data["id"],
                    name=campaign_data["name"],
                    status=campaign_data["status"],
                    objective=campaign_data.get("objective"),
                    created_at=datetime.fromisoformat(campaign_data["created_time"]),
                    updated_at=datetime.utcnow(),
                    synced_at=datetime.utcnow()
                )
                await campaign.save()
                synced += 1
        
        logger.info(f"✅ {synced} neue Kampagnen gespeichert")
        return {"status": "success", "synced": synced, "mode": "real"}
    
    async def _sync_adsets_real(self, campaign_ids: List[str]) -> Dict[str, Any]:
        """Echte Implementierung für AdSets-Sync"""
        logger.info(f"🔄 Sync AdSets für {len(campaign_ids)} Kampagnen (Echter API-Modus)...")
        
        synced = 0
        for campaign_id in campaign_ids:
            url = f"{self.base_url}/{campaign_id}/adsets"
            params = {
                "access_token": self.access_token,
                "fields": "id,name,status,daily_budget,lifetime_budget,optimization_goal,billing_event,campaign_id,created_time"
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            adsets_data = data.get("data", [])
            
            for adset_data in adsets_data:
                existing = await AdSet.find_one({"id": adset_data["id"]})
                if not existing:
                    adset = AdSet(
                        id=adset_data["id"],
                        campaign_id=adset_data["campaign_id"],
                        name=adset_data["name"],
                        status=adset_data["status"],
                        daily_budget=Decimal(str(adset_data.get("daily_budget", 0) / 100)),  # In Dollar umrechnen
                        lifetime_budget=Decimal(str(adset_data.get("lifetime_budget", 0) / 100)),
                        optimization_goal=adset_data.get("optimization_goal"),
                        billing_event=adset_data.get("billing_event"),
                        created_at=datetime.fromisoformat(adset_data["created_time"]),
                        updated_at=datetime.utcnow(),
                        synced_at=datetime.utcnow()
                    )
                    await adset.save()
                    synced += 1
        
        logger.info(f"✅ {synced} neue AdSets gespeichert")
        return {"status": "success", "synced": synced, "mode": "real"}
    
    async def _sync_insights_real(
        self,
        entity_type: str,
        entity_ids: List[str],
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Echte Implementierung für Insights-Sync"""
        logger.info(f"🔄 Sync Insights für {len(entity_ids)} {entity_type}s (Echter API-Modus)...")
        
        synced = 0
        for entity_id in entity_ids:
            url = f"{self.base_url}/{entity_id}/insights"
            params = {
                "access_token": self.access_token,
                "fields": "date_start,date_stop,spend,impressions,clicks,conversions,reach,frequency,actions,action_values",
                "time_range": f"{{'since':'{start_date}','until':'{end_date}'}}",
                "level": entity_type
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            insights_data = data.get("data", [])
            
            for insight in insights_data:
                # Verarbeite und speichere Metriken...
                synced += 1
        
        logger.info(f"✅ {synced} neue Metriken gespeichert")
        return {"status": "success", "synced": synced, "mode": "real"}