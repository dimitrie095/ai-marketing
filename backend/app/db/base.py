"""
Base module exports for MongoDB with Beanie ODM
"""

from .models import (
    Campaign,
    AdSet,
    Ad,
    Metric,
    ProcessedData,
    RawData,
    MetaInsights,
    GoogleAdsReport,
    CreativeSpec,
    ActionValues
)

# Re-export all document models
__all__ = [
    "Campaign",
    "AdSet", 
    "Ad",
    "Metric",
    "ProcessedData",
    "RawData",
    "MetaInsights",
    "GoogleAdsReport",
    "CreativeSpec",
    "ActionValues"
]