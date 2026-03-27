"""
Beanie ODM Models for Marketing Analytics AI
MongoDB Document models for collections
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from beanie import Document, Link, Indexed
from pydantic import Field, BaseModel, field_validator
from bson import Decimal128


# ── Shared helper ──────────────────────────────────────────────────────────────

def decimal128_to_decimal(v: Any) -> Optional[Decimal]:
    """Convert MongoDB Decimal128 → Python Decimal, pass through everything else."""
    if isinstance(v, Decimal128):
        return Decimal(str(v))
    return v


# ── Embedded documents ─────────────────────────────────────────────────────────

class CreativeSpec(BaseModel):
    image_url: Optional[str] = None
    headline: Optional[str] = None
    description: Optional[str] = None
    call_to_action: Optional[str] = None
    link_url: Optional[str] = None
    additional_fields: Optional[Dict[str, Any]] = None


# ── Documents ──────────────────────────────────────────────────────────────────

class Campaign(Document):
    id: str
    name: str
    status: str
    objective: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    synced_at: Optional[datetime] = None
    version: int = Field(default=1)

    class Settings:
        name = "campaigns"
        indexes = [
            [("status", 1)],
            [("updated_at", -1)],
            [("created_at", -1)],
        ]


class AdSet(Document):
    id: str
    campaign_id: str
    name: str
    status: str
    daily_budget: Optional[Decimal] = None
    lifetime_budget: Optional[Decimal] = None
    optimization_goal: Optional[str] = None
    billing_event: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    synced_at: Optional[datetime] = None

    @field_validator("daily_budget", "lifetime_budget", mode="before")
    @classmethod
    def coerce_decimal128(cls, v: Any) -> Optional[Decimal]:
        return decimal128_to_decimal(v)

    class Settings:
        name = "ad_sets"
        indexes = [
            [("campaign_id", 1)],
            [("status", 1)],
            [("updated_at", -1)],
            [("campaign_id", 1), ("status", 1)],
        ]


class Ad(Document):
    id: str
    ad_set_id: str
    name: str
    status: str
    creative_type: Optional[str] = None
    image_hash: Optional[str] = None
    image_url: Optional[str] = None
    creative_spec: Optional[CreativeSpec] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    synced_at: Optional[datetime] = None

    class Settings:
        name = "ads"
        indexes = [
            [("ad_set_id", 1)],
            [("status", 1)],
            [("updated_at", -1)],
            [("creative_type", 1)],
            [("ad_set_id", 1), ("status", 1)],
        ]


class Metric(Document):
    date: date
    entity_type: str
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

    @field_validator("spend", "revenue", "frequency", mode="before")
    @classmethod
    def coerce_decimal128(cls, v: Any) -> Any:
        return decimal128_to_decimal(v)

    class Settings:
        name = "metrics"
        indexes = [
            [("entity_type", 1), ("entity_id", 1), ("date", 1)],
            [("date", -1)],
            [("entity_id", 1)],
            [("entity_type", 1)],
            [("entity_id", 1), ("date", -1)],
        ]


class ProcessedData(Document):
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

    @field_validator("rpm", "cpc", "ctr", "roi", "conversions_rate", "score", mode="before")
    @classmethod
    def coerce_decimal128(cls, v: Any) -> Optional[Decimal]:
        return decimal128_to_decimal(v)

    class Settings:
        name = "processed_data"
        indexes = [
            [("campaign_id", 1), ("date", 1)],
            [("campaign_id", 1)],
            [("date", -1)],
            [("campaign_id", 1), ("date", -1), ("score", -1)],
        ]


class RawData(Document):
    campaign_id: str
    date: date
    content: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "raw_data"
        indexes = [
            [("campaign_id", 1), ("date", 1)],
            [("campaign_id", 1)],
            [("date", -1)],
        ]


class ActionValues(BaseModel):
    value: Optional[str] = None
    action_type: Optional[str] = None


class MetaInsights(Document):
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

    @field_validator("spend", "ctr", "cpc", "cpm", "frequency", mode="before")
    @classmethod
    def coerce_decimal128(cls, v: Any) -> Optional[Decimal]:
        return decimal128_to_decimal(v)

    class Settings:
        name = "meta_insights"
        indexes = [
            [("campaign_id", 1), ("date_start", 1)],
            [("ad_set_id", 1), ("date_start", 1)],
            [("ad_id", 1), ("date_start", 1)],
            [("date_start", -1)],
            [("date_stop", -1)],
        ]


class GoogleAdsReport(Document):
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

    class Settings:
        name = "google_ads_reports"
        indexes = [
            [("campaign_id", 1), ("segments_date", 1)],
            [("ad_group_id", 1), ("segments_date", 1)],
            [("ad_id", 1), ("segments_date", 1)],
            [("segments_date", -1)],
            [("campaign_name", 1)],
        ]


class User(Document):
    username: Indexed(str, unique=True)  # type: ignore
    email: Indexed(str, unique=True)  # type: ignore
    hashed_password: str
    full_name: Optional[str] = None
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = [
            [("username", 1)],
            [("email", 1)],
            [("is_active", 1)],
        ]