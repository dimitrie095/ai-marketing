"""
KPI Service Layer
Phase 2: P-01 - Bereitstellung von KPI-Daten für API und Frontend
"""

from typing import List, Optional, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from app.db.models import Metric, ProcessedData
from app.processing.kpi_engine import KPIEngine, KPIResult
import json


class KPIService:
    """
    Service Layer für KPI-bezogene Operationen
    Kümmert sich um Datenabruf, -berechnung und -formatierung
    """
    
    @staticmethod
    async def get_kpi_for_entity(
        entity_type: str,
        entity_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Holt KPIs für eine spezifische Entity über einen Zeitraum
        
        Args:
            entity_type: 'campaign', 'adset', oder 'ad'
            entity_id: ID der Entity
            start_date: Start Datum
            end_date: End Datum
            
        Returns:
            Dictionary mit KPI-Ergebnissen und Metadaten
        """
        try:
            # Berechne KPIs
            kpi_result = await KPIEngine.calculate_for_period(
                entity_type=entity_type,
                entity_id=entity_id,
                start_date=start_date,
                end_date=end_date
            )
            
            # Ergebnis formatieren
            return {
                "status": "success",
                "data": json.loads(kpi_result.json()),
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "entity": {
                    "type": entity_type,
                    "id": entity_id
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Fehler bei KPI-Berechnung: {str(e)}",
                "entity": {
                    "type": entity_type,
                    "id": entity_id
                }
            }
    
    @staticmethod
    async def get_trend_data(
        entity_type: str,
        entity_id: str,
        kpi_name: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Holt tägliche Trend-Daten für einen bestimmten KPI
        
        Args:
            entity_type: 'campaign', 'adset', oder 'ad'
            entity_id: ID der Entity
            kpi_name: Name des KPIs (ctr, cpc, roas, etc.)
            start_date: Start Datum
            end_date: End Datum
            
        Returns:
            Dictionary mit Trend-Daten
        """
        try:
            # Hole alle Metriken für den Zeitraum
            metrics = await Metric.find({
                "entity_type": entity_type,
                "entity_id": entity_id,
                "date": {"$gte": start_date, "$lte": end_date}
            }).sort("date").to_list()
            
            if not metrics:
                return {
                    "status": "no_data",
                    "message": "Keine Daten für den angegebenen Zeitraum",
                    "data": []
                }
            
            # Berechne KPI für jeden Tag
            trend_data = []
            for metric in metrics:
                kpi_value = None
                
                if kpi_name == "ctr":
                    kpi_value = KPIEngine._calculate_ctr(metric.clicks, metric.impressions)
                elif kpi_name == "cpc":
                    kpi_value = KPIEngine._calculate_cpc(metric.spend, metric.clicks)
                elif kpi_name == "roas":
                    kpi_value = KPIEngine._calculate_roas(metric.revenue, metric.spend)
                elif kpi_name == "cvr":
                    kpi_value = KPIEngine._calculate_cvr(metric.conversions, metric.clicks)
                elif kpi_name == "rpm":
                    kpi_value = KPIEngine._calculate_rpm(metric.revenue, metric.impressions)
                elif kpi_name == "roi":
                    kpi_value = KPIEngine._calculate_roi(metric.revenue, metric.spend)
                elif kpi_name == "spend":
                    kpi_value = metric.spend
                elif kpi_name == "revenue":
                    kpi_value = metric.revenue
                
                trend_data.append({
                    "date": metric.date.isoformat(),
                    "value": float(kpi_value) if kpi_value else 0.0,
                    "raw_metrics": {
                        "impressions": metric.impressions,
                        "clicks": metric.clicks,
                        "conversions": metric.conversions,
                        "spend": float(metric.spend),
                        "revenue": float(metric.revenue)
                    }
                })
            
            return {
                "status": "success",
                "kpi": kpi_name,
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "entity": {
                    "type": entity_type,
                    "id": entity_id
                },
                "data": trend_data
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Fehler beim Abrufen von Trend-Daten: {str(e)}"
            }
    
    @staticmethod
    async def get_comparison_data(
        entity_type: str,
        entity_ids: List[str],
        kpi_name: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Vergleicht einen KPI über mehrere Entities
        
        Args:
            entity_type: 'campaign', 'adset', oder 'ad'
            entity_ids: Liste von Entity IDs
            kpi_name: Name des KPIs
            start_date: Start Datum
            end_date: End Datum
            
        Returns:
            Dictionary mit Vergleichsdaten
        """
        try:
            comparison_data = []
            
            for entity_id in entity_ids:
                # Berechne KPI für diese Entity
                kpi_result = await KPIEngine.calculate_for_period(
                    entity_type=entity_type,
                    entity_id=entity_id,
                    start_date=start_date,
                    end_date=end_date
                )
                
                kpi_value = None
                if kpi_name == "ctr":
                    kpi_value = kpi_result.ctr
                elif kpi_name == "cpc":
                    kpi_value = kpi_result.cpc
                elif kpi_name == "roas":
                    kpi_value = kpi_result.roas
                elif kpi_name == "cvr":
                    kpi_value = kpi_result.cvr
                elif kpi_name == "rpm":
                    kpi_value = kpi_result.rpm
                elif kpi_name == "roi":
                    kpi_value = kpi_result.roi
                elif kpi_name == "spend":
                    kpi_value = kpi_result.spend
                elif kpi_name == "revenue":
                    kpi_value = kpi_result.revenue
                
                comparison_data.append({
                    "entity_id": entity_id,
                    "value": float(kpi_value) if kpi_value else 0.0,
                    "raw_metrics": {
                        "impressions": kpi_result.impressions,
                        "clicks": kpi_result.clicks,
                        "conversions": kpi_result.conversions,
                        "spend": float(kpi_result.spend),
                        "revenue": float(kpi_result.revenue)
                    }
                })
            
            # Sortiere nach Wert (absteigend)
            comparison_data.sort(key=lambda x: x["value"], reverse=True)
            
            return {
                "status": "success",
                "kpi": kpi_name,
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "entity_type": entity_type,
                "data": comparison_data
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Fehler beim Vergleich: {str(e)}"
            }
    
    @staticmethod
    async def get_kpis_for_campaign_list(
        campaign_ids: List[str],
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Holt KPIs für eine Liste von Kampagnen
        
        Args:
            campaign_ids: Liste von Campaign IDs
            start_date: Start Datum
            end_date: End Datum
            
        Returns:
            Dictionary mit KPIs für alle Kampagnen
        """
        try:
            results = []
            
            for campaign_id in campaign_ids:
                kpi_result = await KPIEngine.calculate_for_period(
                    entity_type="campaign",
                    entity_id=campaign_id,
                    start_date=start_date,
                    end_date=end_date
                )
                
                results.append({
                    "campaign_id": campaign_id,
                    "kpis": {
                        "ctr": float(kpi_result.ctr) if kpi_result.ctr else 0.0,
                        "cpc": float(kpi_result.cpc) if kpi_result.cpc else 0.0,
                        "roas": float(kpi_result.roas) if kpi_result.roas else 0.0,
                        "cvr": float(kpi_result.cvr) if kpi_result.cvr else 0.0,
                        "rpm": float(kpi_result.rpm) if kpi_result.rpm else 0.0,
                        "roi": float(kpi_result.roi) if kpi_result.roi else 0.0,
                        "cpm": float(kpi_result.cpm) if kpi_result.cpm else 0.0,
                        "cpa": float(kpi_result.cpa) if kpi_result.cpa else 0.0,
                    },
                    "raw_metrics": {
                        "impressions": kpi_result.impressions,
                        "clicks": kpi_result.clicks,
                        "conversions": kpi_result.conversions,
                        "spend": float(kpi_result.spend),
                        "revenue": float(kpi_result.revenue)
                    }
                })
            
            return {
                "status": "success",
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "data": results
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Fehler: {str(e)}"
            }