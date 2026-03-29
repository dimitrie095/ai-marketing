"""
Ad Platform Configuration Models
MongoDB Document models for Google Ads and Meta Ads configurations
"""

from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import Field


class AdPlatformConfig(Document):
    """Configuration for advertising platforms (Google Ads, Meta Ads)"""
    platform: str  # "google_ads", "meta_ads"
    name: str  # User-defined name for this configuration
    is_active: bool = Field(default=False)
    # Google Ads fields
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_refresh_token: Optional[str] = None
    google_developer_token: Optional[str] = None
    google_login_customer_id: Optional[str] = None
    # Meta Ads fields
    meta_access_token: Optional[str] = None
    meta_app_id: Optional[str] = None
    meta_ad_account_id: Optional[str] = None
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "ad_platform_configs"
        indexes = [
            [("platform", 1)],
            [("is_active", 1)],
            [("platform", 1), ("is_active", 1)],
            [("created_at", -1)],
        ]