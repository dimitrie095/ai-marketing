#!/usr/bin/env python
"""
Test script for persistent campaign storage
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.demo_storage import (
    load_demo_campaigns,
    save_demo_campaigns,
    add_campaign,
    find_campaign
)

def test_storage():
    print("🧪 Testing persistent campaign storage...")
    
    # Load initial data
    campaigns, adsets = load_demo_campaigns()
    print(f"✓ Loaded {len(campaigns)} campaigns")
    
    # Add new campaign
    new_campaign = {
        "id": "camp_test_001",
        "name": "Test Campaign Persistent",
        "status": "ACTIVE",
        "objective": "CONVERSIONS",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "synced_at": None,
        "ad_sets_count": 0,
        "total_spend": 0.0,
        "total_revenue": 0.0
    }
    
    campaigns, adsets = add_campaign(campaigns, adsets, new_campaign)
    print(f"✓ Added new campaign, now have {len(campaigns)} campaigns")
    
    # Save to file
    if save_demo_campaigns(campaigns, adsets):
        print("✓ Saved campaigns to file")
    
    # Reload from file
    campaigns2, adsets2 = load_demo_campaigns()
    print(f"✓ Reloaded {len(campaigns2)} campaigns from file")
    
    # Find the new campaign
    found = find_campaign(campaigns2, "camp_test_001")
    if found:
        print(f"✓ Found test campaign: {found['name']}")
    else:
        print("❌ Test campaign not found after reload!")
        return False
    
    print("\n✅ All tests passed! Persistent storage is working.")
    return True

if __name__ == "__main__":
    os.chdir(os.path.dirname(__file__))
    success = test_storage()
    sys.exit(0 if success else 1)
