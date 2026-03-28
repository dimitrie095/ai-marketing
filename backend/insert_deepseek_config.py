#!/usr/bin/env python3
"""
Insert DeepSeek configuration using pymongo directly.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime
import pymongo

# Load environment variables
load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
if not MONGODB_URL:
    print("❌ MONGODB_URL not set")
    sys.exit(1)

DB_NAME = "marketing_ai"

def main():
    print("Connecting to MongoDB...")
    client = pymongo.MongoClient(MONGODB_URL)
    db = client[DB_NAME]
    
    print("Collections:", db.list_collection_names())
    
    # List all providers
    all_providers = list(db.llm_providers.find())
    print("All providers:", all_providers)
    
    # Check provider exists
    provider = db.llm_providers.find_one({"name": "deepseek"})
    if not provider:
        print("❌ DeepSeek provider not found")
        client.close()
        sys.exit(1)
    print("Provider found:", provider)
    
    print(f"✅ Provider found: {provider['display_name']}")
    
    # Check existing config
    existing = db.llm_configs.find_one({"provider_id": 2})
    if existing:
        print(f"ℹ️  DeepSeek config already exists: {existing['name']}")
        client.close()
        return
    
    # Get next ID - simple increment
    # Find max id
    max_doc = db.llm_configs.find_one(sort=[("id", -1)])
    next_id = 1
    if max_doc and "id" in max_doc:
        next_id = max_doc["id"] + 1
    
    # Create config document
    config = {
        "id": next_id,
        "name": "DeepSeek Test Config",
        "provider_id": 2,
        "model_name": "deepseek-chat",
        "api_key_encrypted": os.getenv("DEEPSEEK_API_KEY", "dummy_key"),
        "max_tokens": 4096,
        "temperature": 0.7,
        "top_p": 1.0,
        "is_active": True,
        "is_default": False,
        "cost_per_1k_input_tokens": 0.0007,
        "cost_per_1k_output_tokens": 0.0007,
        "created_at": datetime.utcnow(),
        "updated_at": None
    }
    
    result = db.llm_configs.insert_one(config)
    print(f"✅ DeepSeek configuration inserted with ID: {next_id}")
    print(f"   Inserted ID: {result.inserted_id}")
    
    client.close()

if __name__ == "__main__":
    main()