"""
Persistent Demo Data Storage Service
Handles storage and loading of demo campaigns in JSON format
"""

import json
import os
import threading
import fcntl
from datetime import datetime
from typing import Tuple, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Use a more robust path - in the project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DEMO_DATA_FILE = os.path.join(PROJECT_ROOT, "demo_data", "campaigns.json")

# Thread-safe file operations lock
_file_lock = threading.Lock()

def ensure_data_directory():
    """Ensure the demo_data directory exists"""
    os.makedirs(os.path.dirname(DEMO_DATA_FILE), exist_ok=True)

def load_demo_campaigns() -> Tuple[List[Dict], Dict]:
    """
    Load demo campaigns from JSON file
    Returns: (campaigns_list, adsets_dict)
    """
    try:
        # Ensure directory exists
        ensure_data_directory()
        logger.info(f"[Demo Storage] Loading campaigns from: {DEMO_DATA_FILE}")
        
        if not os.path.exists(DEMO_DATA_FILE):
            logger.info("[Demo Storage] No existing data file, creating default data")
            default_campaigns, default_adsets = get_default_campaigns()
            save_demo_campaigns(default_campaigns, default_adsets)
            return default_campaigns, default_adsets
        
        with open(DEMO_DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            campaigns = data.get('campaigns', [])
            adsets = data.get('adsets', {})
            logger.info(f"[Demo Storage] Loaded {len(campaigns)} campaigns, {len(adsets)} adset groups")
            return campaigns, adsets
            
    except Exception as e:
        logger.error(f"[Demo Storage] Error loading campaigns: {e}")
        # Return defaults on error
        return get_default_campaigns()

def save_demo_campaigns(campaigns: List[Dict], adsets: Dict[str, List]) -> bool:
    """
    Save demo campaigns to JSON file (thread-safe with atomic operations)
    Returns: True if successful, False otherwise
    """
    temp_file = None
    try:
        ensure_data_directory()
        
        # Prepare data
        data = {
            "campaigns": campaigns,
            "adsets": adsets,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        # Thread-safe file operation with atomic write
        with _file_lock:
            # Write to temporary file first
            temp_file = f"{DEMO_DATA_FILE}.tmp"
            with open(temp_file, 'w', encoding='utf-8') as f:
                # File locking for extra safety on Unix systems
                if hasattr(fcntl, 'flock'):
                    fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)
                
                if hasattr(fcntl, 'flock'):
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)
            
            # Atomic rename to ensure consistency
            os.replace(temp_file, DEMO_DATA_FILE)
        
        logger.info(f"[Demo Storage] Successfully saved {len(campaigns)} campaigns to file")
        return True
        
    except Exception as e:
        logger.error(f"[Demo Storage] Error saving campaigns: {e}")
        # Clean up temp file if it exists
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except:
                pass
        return False

def get_default_campaigns():
    """Return the default campaign data"""
    default_campaigns = [
        {
            "id": "camp_1",
            "name": "Q1 2025 Konversionskampagne",
            "status": "ACTIVE",
            "objective": "CONVERSIONS",
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-15T00:00:00Z",
            "synced_at": None,
            "ad_sets_count": 3,
            "total_spend": 2540.50,
            "total_revenue": 6780.00
        },
        {
            "id": "camp_2",
            "name": "Brand Awareness Kampagne",
            "status": "PAUSED",
            "objective": "REACH",
            "created_at": "2025-01-15T00:00:00Z",
            "updated_at": "2025-01-20T00:00:00Z",
            "synced_at": None,
            "ad_sets_count": 2,
            "total_spend": 1200.00,
            "total_revenue": 2340.00
        },
        {
            "id": "camp_3",
            "name": "Sommer Sale 2025",
            "status": "ACTIVE",
            "objective": "CONVERSIONS",
            "created_at": "2025-02-01T00:00:00Z",
            "updated_at": "2025-02-10T00:00:00Z",
            "synced_at": None,
            "ad_sets_count": 4,
            "total_spend": 3890.75,
            "total_revenue": 9450.00
        }
    ]

    default_adsets = {
        "camp_1": [
            {"id": "as_1_1", "campaign_id": "camp_1", "name": "AdSet 1 - DE", "status": "ACTIVE", "daily_budget": 50.0, "optimization_goal": "CONVERSIONS", "billing_event": "IMPRESSIONS", "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-10T00:00:00Z", "ads_count": 2},
            {"id": "as_1_2", "campaign_id": "camp_1", "name": "AdSet 2 - AT", "status": "ACTIVE", "daily_budget": 30.0, "optimization_goal": "CONVERSIONS", "billing_event": "IMPRESSIONS", "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-10T00:00:00Z", "ads_count": 1},
            {"id": "as_1_3", "campaign_id": "camp_1", "name": "AdSet 3 - CH", "status": "PAUSED", "daily_budget": 20.0, "optimization_goal": "CONVERSIONS", "billing_event": "IMPRESSIONS", "created_at": "2025-01-05T00:00:00Z", "updated_at": "2025-01-15T00:00:00Z", "ads_count": 1},
        ],
        "camp_2": [
            {"id": "as_2_1", "campaign_id": "camp_2", "name": "AdSet 1 - Reach DE", "status": "ACTIVE", "daily_budget": 40.0, "optimization_goal": "REACH", "billing_event": "IMPRESSIONS", "created_at": "2025-01-15T00:00:00Z", "updated_at": "2025-01-20T00:00:00Z", "ads_count": 1},
            {"id": "as_2_2", "campaign_id": "camp_2", "name": "AdSet 2 - Reach AT", "status": "PAUSED", "daily_budget": 25.0, "optimization_goal": "REACH", "billing_event": "IMPRESSIONS", "created_at": "2025-01-15T00:00:00Z", "updated_at": "2025-01-18T00:00:00Z", "ads_count": 1},
        ],
        "camp_3": [
            {"id": "as_3_1", "campaign_id": "camp_3", "name": "AdSet 1 - Early Birds", "status": "ACTIVE", "daily_budget": 60.0, "optimization_goal": "CONVERSIONS", "billing_event": "IMPRESSIONS", "created_at": "2025-02-01T00:00:00Z", "updated_at": "2025-02-10T00:00:00Z", "ads_count": 2},
            {"id": "as_3_2", "campaign_id": "camp_3", "name": "AdSet 2 - Main Sale", "status": "ACTIVE", "daily_budget": 80.0, "optimization_goal": "CONVERSIONS", "billing_event": "IMPRESSIONS", "created_at": "2025-02-01T00:00:00Z", "updated_at": "2025-02-10T00:00:00Z", "ads_count": 2},
        ]
    }
    
    return default_campaigns, default_adsets

def find_campaign(campaigns: List[Dict], campaign_id: str) -> Dict | None:
    """Find a campaign by ID"""
    return next((c for c in campaigns if c.get("id") == campaign_id), None)

def find_adset(adsets: Dict[str, List], campaign_id: str, adset_id: str) -> Dict | None:
    """Find an adset by campaign ID and adset ID"""
    campaign_adsets = adsets.get(campaign_id, [])
    return next((a for a in campaign_adsets if a.get("id") == adset_id), None)

def add_campaign(campaigns: List[Dict], adsets: Dict[str, List], campaign: Dict) -> Tuple[List, Dict]:
    """Add a new campaign"""
    new_campaigns = campaigns.copy()
    new_adsets = adsets.copy()
    
    new_campaigns.append(campaign)
    new_adsets[campaign["id"]] = []
    
    return new_campaigns, new_adsets

def update_campaign(campaigns: List[Dict], campaign_id: str, updates: Dict) -> List[Dict]:
    """Update an existing campaign"""
    new_campaigns = campaigns.copy()
    
    for campaign in new_campaigns:
        if campaign.get("id") == campaign_id:
            campaign.update(updates)
            campaign["updated_at"] = datetime.utcnow().isoformat()
    
    return new_campaigns

def delete_campaign(campaigns: List[Dict], adsets: Dict[str, List], campaign_id: str) -> Tuple[List, Dict]:
    """Delete a campaign and its adsets"""
    new_campaigns = [c for c in campaigns if c.get("id") != campaign_id]
    new_adsets = {cid: adsets for cid, adsets in adsets.items() if cid != campaign_id}
    
    return new_campaigns, new_adsets


def add_adset(campaigns: List[Dict], adsets: Dict[str, List], adset: Dict) -> Tuple[List, Dict]:
    """Add a new adset to a campaign"""
    new_campaigns = campaigns.copy()
    new_adsets = adsets.copy()
    
    campaign_id = adset.get("campaign_id")
    if not campaign_id:
        raise ValueError("AdSet must have campaign_id")
    
    # Ensure campaign exists
    campaign_exists = any(c.get("id") == campaign_id for c in new_campaigns)
    if not campaign_exists:
        raise ValueError(f"Campaign {campaign_id} does not exist")
    
    # Initialize list if not present
    if campaign_id not in new_adsets:
        new_adsets[campaign_id] = []
    
    # Check if adset already exists (by id)
    existing_ids = {a.get("id") for a in new_adsets[campaign_id]}
    if adset.get("id") in existing_ids:
        raise ValueError(f"AdSet with id {adset.get('id')} already exists")
    
    # Add adset
    new_adsets[campaign_id].append(adset)
    
    # Update campaign's ad_sets_count
    for campaign in new_campaigns:
        if campaign.get("id") == campaign_id:
            campaign["ad_sets_count"] = len(new_adsets[campaign_id])
            campaign["updated_at"] = datetime.utcnow().isoformat()
            break
    
    return new_campaigns, new_adsets