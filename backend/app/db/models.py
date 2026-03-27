"""
Beanie ODM Models for Marketing Analytics AI
MongoDB Document models for collections
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from beanie import Document, Link, Indexed
from pydantic import Field, BaseModel


class CreativeSpec(BaseModel):
    """Embedded document for ad creative specifications"""
    image_url: Optional[str] = None
    headline: Optional[str] = None
    description: Optional[str] = None
    call_to_action: Optional[str] = None
    link_url: Optional[str] = None
    additional_fields: Optional[Dict[str, Any]] = None


class Campaign(Document):
    """Marketing campaign document"""
    id: str  # Meta Ads Campaign ID - using as custom _id
    name: str
    status: str  # ACTIVE, PAUSED, DELETED, ARCHIVED
    objective: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    synced_at: Optional[datetime] = None
    version: int = Field(default=1)  # Optimistic locking version
    
    # Settings
    class Settings:
        name = "campaigns"
        indexes = [
            [("status", 1)],
            [("updated_at", -1)],
            [("created_at", -1)]
        ]


class AdSet(Document):
    """Ad set document - belongs to campaign"""
    id: str  # Meta Ads Ad Set ID - using as custom _id
    campaign_id: str  # Reference to campaign
    name: str
    status: str  # ACTIVE, PAUSED, DELETED, ARCHIVED
    daily_budget: Optional[Decimal] = None
    lifetime_budget: Optional[Decimal] = None
    optimization_goal: Optional[str] = None
    billing_event: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    synced_at: Optional[datetime] = None
    
    # Settings
    class Settings:
        name = "ad_sets"
        indexes = [
            [("campaign_id", 1)],
            [("status", 1)],
            [("updated_at", -1)],
            [("campaign_id", 1), ("status", 1)]
        ]


class Ad(Document):
    """Ad document - belongs to ad set"""
    id: str  # Meta Ads Ad ID - using as custom _id
    ad_set_id: str  # Reference to ad set
    name: str
    status: str  # ACTIVE, PAUSED, DELETED, ARCHIVED, IN_PROCESS
    creative_type: Optional[str] = None  # IMAGE, VIDEO, CAROUSEL, etc.
    image_hash: Optional[str] = None
    image_url: Optional[str] = None
    creative_spec: Optional[CreativeSpec] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    synced_at: Optional[datetime] = None
    
    # Settings
    class Settings:
        name = "ads"
        indexes = [
            [("ad_set_id", 1)],
            [("status", 1)],
            [("updated_at", -1)],
            [("creative_type", 1)],
            [("ad_set_id", 1), ("status", 1)]
        ]


class Metric(Document):
    """Performance metrics document"""
    date: date
    entity_type: str  # campaign, adset, ad
    entity_id: str
    spend: Decimal = Field(default=Decimal("0"))
    impressions: int = Field(default=0)
    clicks: int = Field(default=0)
    conversions: int = Field(default=0)
    revenue: Decimal = Field(default=Decimal("0"))
    reach: int = Field(default=0)
    frequency: Decimal = Field(default=Decimal("0"))
    engagement: int = Field(default=0)
    video_views: int = Field(default=0)
    video_p50_watched_actions: int = Field(default=0)
    video_p75_watched_actions: int = Field(default=0)
    video_p95_watched_actions: int = Field(default=0)
    video_p100_watched_actions: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Settings
    class Settings:
        name = "metrics"
        indexes = [
            [("entity_type", 1), ("entity_id", 1), ("date", 1)],  # Unique compound index
            [("date", -1)],
            [("entity_id", 1)],
            [("entity_type", 1)],
            [("entity_id", 1), ("date", -1)]
        ]


class ProcessedData(Document):
    """Processed/aggregated data document"""
    campaign_id: str
    date: date
    rpm: Optional[Decimal] = None
    cpc: Optional[Decimal] = None
    ctr: Optional[Decimal] = None
    roi: Optional[Decimal] = None
    conversions_rate: Optional[Decimal] = None
    score: Optional[Decimal] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    # Settings
    class Settings:
        name = "processed_data"
        indexes = [
            [("campaign_id", 1), ("date", 1)],  # Unique compound index
            [("campaign_id", 1)],
            [("date", -1)],
            [("campaign_id", 1), ("date", -1), ("score", -1)]
        ]


class RawData(Document):
    """Raw data storage document"""
    campaign_id: str
    date: date
    content: Dict[str, Any]  # Flexible storage for raw data
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Settings
    class Settings:
        name = "raw_data"
        indexes = [
            [("campaign_id", 1), ("date", 1)],  # Unique compound index
            [("campaign_id", 1)],
            [("date", -1)]
        ]


class ActionValues(BaseModel):
    """Action values subdocument for Meta Insights"""
    value: Optional[str] = None
    action_type: Optional[str] = None


class MetaInsights(Document):
    """Meta Ads insights document"""
    campaign_id: Optional[str] = None
    ad_set_id: Optional[str] = None
    ad_id: Optional[str] = None
    date_start: Optional[date] = None
    date_stop: Optional[date] = None
    spend: Optional[Decimal] = None
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    conversions: Optional[int] = None
    ctr: Optional[Decimal] = None
    cpc: Optional[Decimal] = None
    cpm: Optional[Decimal] = None
    reach: Optional[int] = None
    frequency: Optional[Decimal] = None
    actions: Optional[List[ActionValues]] = None
    action_values: Optional[List[ActionValues]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Settings
    class Settings:
        name = "meta_insights"
        indexes = [
            [("campaign_id", 1), ("date_start", 1)],
            [("ad_set_id", 1), ("date_start", 1)],
            [("ad_id", 1), ("date_start", 1)],
            [("date_start", -1)],
            [("date_stop", -1)]
        ]


class GoogleAdsReport(Document):
    """Google Ads API report document"""
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    ad_group_id: Optional[str] = None
    ad_group_name: Optional[str] = None
    ad_id: Optional[str] = None
    ad_name: Optional[str] = None
    metrics_impressions: Optional[int] = None
    metrics_clicks: Optional[int] = None
    metrics_conversions: Optional[int] = None
    metrics_cost_micros: Optional[int] = None
    metrics_ctr: Optional[float] = None
    segments_date: Optional[date] = None
    segments_device: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Settings
    class Settings:
        name = "google_ads_reports"
        indexes = [
            [("campaign_id", 1), ("segments_date", 1)],
            [("ad_group_id", 1), ("segments_date", 1)],
            [("ad_id", 1), ("segments_date", 1)],
            [("segments_date", -1)],
            [("campaign_name", 1)]
        ]


class User(Document):
    """User document for authentication"""
    username: Indexed(str, unique=True)  # type: ignore
    email: Indexed(str, unique=True)  # type: ignore
    hashed_password: str
    full_name: Optional[str] = None
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Settings
    class Settings:
        name = "users"
        indexes = [
            [("username", 1)],
            [("email", 1)],
            [("is_active", 1)]
        ]