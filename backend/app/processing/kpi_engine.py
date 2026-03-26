"""
KPI Engine - Berechnung von Marketing-KPIs
Phase 2: P-01 - Core Features & KPI Engine
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel
from app.db.models import Metric, Campaign, AdSet, Ad, ProcessedData
import statistics


class KPIResult(BaseModel):
    """Ergebnis einer KPI-Berechnung"""
    campaign_id: Optional[str] = None
    ad_set_id: Optional[str] = None
    ad_id: Optional[str] = None
    date: Optional[date] = None
    
    # Kern-KPIs
    ctr: Optional[Decimal] = None  # Click-Through Rate (%)
    cpc: Optional[Decimal] = None  # Cost Per Click
    cpm: Optional[Decimal] = None  # Cost Per Mille
    roas: Optional[Decimal] = None  # Return on Ad Spend
    cvr: Optional[Decimal] = None  # Conversion Rate (%)
    rpm: Optional[Decimal] = None  # Revenue Per Mille
    roi: Optional[Decimal] = None  # Return on Investment
    cpa: Optional[Decimal] = None  # Cost Per Acquisition
    
    # Basis-Metriken
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    spend: Decimal = Decimal("0")
    revenue: Decimal = Decimal("0")
    
    # Video Metriken
    video_views: int = 0
    video_p50_rate: Optional[Decimal] = None
    video_p75_rate: Optional[Decimal] = None
    video_p95_rate: Optional[Decimal] = None
    video_p100_rate: Optional[Decimal] = None
    
    # Engagement
    engagement_rate: Optional[Decimal] = None
    
    class Config:
        json_encoders = {
            Decimal: str,
            date: lambda v: v.isoformat()
        }


class KPIEngine:
    """
    KPI Berechnungs-Engine
    Berechnet alle wichtigen Marketing-KPIs deterministisch
    """
    
    @staticmethod
    async def calculate_from_metric(metric: Metric) -> KPIResult:
        """
        Berechnet KPIs aus einem einzelnen Metric-Datensatz
        
        Args:
            metric: Metric Datenbank-Dokument
            
        Returns:
            KPIResult mit berechneten KPIs
        """
        # Basis-KPIs berechnen
        ctr = KPIEngine._calculate_ctr(metric.clicks, metric.impressions)
        cpc = KPIEngine._calculate_cpc(metric.spend, metric.clicks)
        cpm = KPIEngine._calculate_cpm(metric.spend, metric.impressions)
        cvr = KPIEngine._calculate_cvr(metric.conversions, metric.clicks)
        rpm = KPIEngine._calculate_rpm(metric.revenue, metric.impressions)
        roas = KPIEngine._calculate_roas(metric.revenue, metric.spend)
        roi = KPIEngine._calculate_roi(metric.revenue, metric.spend)
        cpa = KPIEngine._calculate_cpa(metric.spend, metric.conversions)
        
        # Video Completion Rates
        video_p50_rate = KPIEngine._calculate_video_rate(metric.video_p50_watched_actions, metric.video_views)
        video_p75_rate = KPIEngine._calculate_video_rate(metric.video_p75_watched_actions, metric.video_views)
        video_p95_rate = KPIEngine._calculate_video_rate(metric.video_p95_watched_actions, metric.video_views)
        video_p100_rate = KPIEngine._calculate_video_rate(metric.video_p100_watched_actions, metric.video_views)
        
        # Engagement Rate
        engagement_rate = KPIEngine._calculate_engagement_rate(metric.engagement, metric.impressions)
        
        return KPIResult(
            entity_id=metric.entity_id,
            entity_type=metric.entity_type,
            date=metric.date,
            
            # Berechnete KPIs
            ctr=ctr,
            cpc=cpc,
            cpm=cpm,
            roas=roas,
            cvr=cvr,
            rpm=rpm,
            roi=roi,
            cpa=cpa,
            
            # Basis-Metriken
            impressions=metric.impressions,
            clicks=metric.clicks,
            conversions=metric.conversions,
            spend=metric.spend,
            revenue=metric.revenue,
            
            # Video Metriken
            video_views=metric.video_views,
            video_p50_rate=video_p50_rate,
            video_p75_rate=video_p75_rate,
            video_p95_rate=video_p95_rate,
            video_p100_rate=video_p100_rate,
            
            # Engagement
            engagement_rate=engagement_rate
        )
    
    @staticmethod
    async def calculate_for_period(
        entity_type: str,
        entity_id: str,
        start_date: date,
        end_date: date
    ) -> KPIResult:
        """
        Berechnet aggregierte KPIs für einen Zeitraum
        
        Args:
            entity_type: 'campaign', 'adset', oder 'ad'
            entity_id: ID der Entity
            start_date: Start Datum (inklusiv)
            end_date: End Datum (inklusiv)
            
        Returns:
            Aggregierte KPIResult
        """
        # Metriken für den Zeitraum laden
        metrics = await Metric.find({
            "entity_type": entity_type,
            "entity_id": entity_id,
            "date": {"$gte": start_date, "$lte": end_date}
        }).to_list()
        
        if not metrics:
            return KPIResult()
        
        # Summen berechnen
        total_impressions = sum(m.impressions for m in metrics)
        total_clicks = sum(m.clicks for m in metrics)
        total_conversions = sum(m.conversions for m in metrics)
        total_spend = sum(m.spend for m in metrics)
        total_revenue = sum(m.revenue for m in metrics)
        total_video_views = sum(m.video_views for m in metrics)
        total_video_p50 = sum(m.video_p50_watched_actions for m in metrics)
        total_video_p75 = sum(m.video_p75_watched_actions for m in metrics)
        total_video_p95 = sum(m.video_p95_watched_actions for m in metrics)
        total_video_p100 = sum(m.video_p100_watched_actions for m in metrics)
        total_engagement = sum(m.engagement for m in metrics)
        
        # KPIs auf aggregierter Ebene berechnen
        ctr = KPIEngine._calculate_ctr(total_clicks, total_impressions)
        cpc = KPIEngine._calculate_cpc(total_spend, total_clicks)
        cpm = KPIEngine._calculate_cpm(total_spend, total_impressions)
        cvr = KPIEngine._calculate_cvr(total_conversions, total_clicks)
        rpm = KPIEngine._calculate_rpm(total_revenue, total_impressions)
        roas = KPIEngine._calculate_roas(total_revenue, total_spend)
        roi = KPIEngine._calculate_roi(total_revenue, total_spend)
        cpa = KPIEngine._calculate_cpa(total_spend, total_conversions)
        
        # Video Completion Rates
        video_p50_rate = KPIEngine._calculate_video_rate(total_video_p50, total_video_views)
        video_p75_rate = KPIEngine._calculate_video_rate(total_video_p75, total_video_views)
        video_p95_rate = KPIEngine._calculate_video_rate(total_video_p95, total_video_views)
        video_p100_rate = KPIEngine._calculate_video_rate(total_video_p100, total_video_views)
        
        # Engagement Rate
        engagement_rate = KPIEngine._calculate_engagement_rate(total_engagement, total_impressions)
        
        return KPIResult(
            entity_id=entity_id,
            entity_type=entity_type,
            
            # Berechnete KPIs
            ctr=ctr,
            cpc=cpc,
            cpm=cpm,
            roas=roas,
            cvr=cvr,
            rpm=rpm,
            roi=roi,
            cpa=cpa,
            
            # Basis-Metriken
            impressions=total_impressions,
            clicks=total_clicks,
            conversions=total_conversions,
            spend=total_spend,
            revenue=total_revenue,
            
            # Video Metriken
            video_views=total_video_views,
            video_p50_rate=video_p50_rate,
            video_p75_rate=video_p75_rate,
            video_p95_rate=video_p95_rate,
            video_p100_rate=video_p100_rate,
            
            # Engagement
            engagement_rate=engagement_rate
        )
    
    @staticmethod
    def _calculate_ctr(clicks: int, impressions: int) -> Optional[Decimal]:
        """Click-Through Rate (%) berechnen"""
        if impressions == 0:
            return None
        return Decimal(str((clicks / impressions) * 100)).quantize(Decimal("0.01"))
    
    @staticmethod
    def _calculate_cpc(spend: Decimal, clicks: int) -> Optional[Decimal]:
        """Cost Per Click berechnen"""
        if clicks == 0:
            return None
        return (spend / clicks).quantize(Decimal("0.01"))
    
    @staticmethod
    def _calculate_cpm(spend: Decimal, impressions: int) -> Optional[Decimal]:
        """Cost Per Mille (1000 Impressions) berechnen"""
        if impressions == 0:
            return None
        return ((spend / impressions) * 1000).quantize(Decimal("0.01"))
    
    @staticmethod
    def _calculate_cvr(conversions: int, clicks: int) -> Optional[Decimal]:
        """Conversion Rate (%) berechnen"""
        if clicks == 0:
            return None
        return Decimal(str((conversions / clicks) * 100)).quantize(Decimal("0.01"))
    
    @staticmethod
    def _calculate_rpm(revenue: Decimal, impressions: int) -> Optional[Decimal]:
        """Revenue Per Mille (1000 Impressions) berechnen"""
        if impressions == 0:
            return None
        return ((revenue / impressions) * 1000).quantize(Decimal("0.01"))
    
    @staticmethod
    def _calculate_roas(revenue: Decimal, spend: Decimal) -> Optional[Decimal]:
        """Return on Ad Spend (Verhältnis) berechnen"""
        if spend == 0:
            return None
        return (revenue / spend).quantize(Decimal("0.01"))
    
    @staticmethod
    def _calculate_roi(revenue: Decimal, spend: Decimal) -> Optional[Decimal]:
        """Return on Investment (%) berechnen"""
        if spend == 0:
            return None
        roi = ((revenue - spend) / spend) * 100
        return Decimal(str(roi)).quantize(Decimal("0.01"))
    
    @staticmethod
    def _calculate_cpa(spend: Decimal, conversions: int) -> Optional[Decimal]:
        """Cost Per Acquisition berechnen"""
        if conversions == 0:
            return None
        return (spend / conversions).quantize(Decimal("0.01"))
    
    @staticmethod
    def _calculate_video_rate(watched: int, views: int) -> Optional[Decimal]:
        """Video Completion Rate (%) berechnen"""
        if views == 0:
            return None
        return Decimal(str((watched / views) * 100)).quantize(Decimal("0.01"))
    
    @staticmethod
    def _calculate_engagement_rate(engagement: int, impressions: int) -> Optional[Decimal]:
        """Engagement Rate (%) berechnen"""
        if impressions == 0:
            return None
        return Decimal(str((engagement / impressions) * 100)).quantize(Decimal("0.01"))


class BatchKPIProcessor:
    """
    Batch-Verarbeitung für historische KPI-Berechnungen
    """
    
    @staticmethod
    async def process_all_campaigns() -> Dict[str, Any]:
        """
        Berechnet KPIs für alle Kampagnen mit Metriken
        Speichert Ergebnisse in processed_data Collection
        """
        from app.db import ProcessedData
        
        results = {
            "processed_campaigns": 0,
            "processed_records": 0,
            "errors": []
        }
        
        try:
            # Hole alle Kampagnen-Metriken mit Fehlern
            campaign_metrics = await Metric.find({
                "entity_type": "campaign"
            }).to_list()
            
            # Gruppiere nach campaign_id und datum
            campaign_dates = {}
            for metric in campaign_metrics:
                if metric.entity_id not in campaign_dates:
                    campaign_dates[metric.entity_id] = set()
                campaign_dates[metric.entity_id].add(metric.date)
            
            # Verarbeite jede Kampagne und jedes Datum
            for campaign_id, dates in campaign_dates.items():
                for metric_date in dates:
                    try:
                        # Berechne KPIs für diesen Tag
                        kpi_result = await KPIEngine.calculate_for_period(
                            entity_type="campaign",
                            entity_id=campaign_id,
                            start_date=metric_date,
                            end_date=metric_date
                        )
                        
                        # Speichere in processed_data
                        processed = ProcessedData(
                            campaign_id=campaign_id,
                            date=metric_date,
                            rpm=kpi_result.rpm,
                            cpc=kpi_result.cpc,
                            ctr=kpi_result.ctr,
                            roi=kpi_result.roi,
                            conversions_rate=kpi_result.cvr,
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow()
                        )
                        await processed.save()
                        
                        results["processed_records"] += 1
                        
                    except Exception as e:
                        results["errors"].append(f"{campaign_id}:{metric_date} - {str(e)}")
                
                results["processed_campaigns"] += 1
            
        except Exception as e:
            results["errors"].append(f"Allgemeiner Fehler: {str(e)}")
        
        return results