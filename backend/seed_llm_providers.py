#!/usr/bin/env python3
"""
Seed LLM Providers Script
Initializes the default LLM providers (OpenAI, DeepSeek, Kimi) in MongoDB
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

# Load environment variables
load_dotenv()

# Import database models
from app.db.models_llm import LLMProvider
from app.db.session import init_database, close_database

# Default provider configurations
DEFAULT_PROVIDERS = [
    {
        "id": 1,
        "name": "openai",
        "display_name": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "docs_url": "https://platform.openai.com/docs"
    },
    {
        "id": 2,
        "name": "deepseek",
        "display_name": "DeepSeek",
        "base_url": "https://api.deepseek.com/v1",
        "docs_url": "https://platform.deepseek.com/api-docs"
    },
    {
        "id": 3,
        "name": "kimi",
        "display_name": "Kimi (Moonshot)",
        "base_url": "https://api.moonshot.cn/v1",
        "docs_url": "https://platform.moonshot.cn/docs"
    }
]

async def seed_providers():
    """Seed the default LLM providers into MongoDB"""
    try:
        print("🔌 Initializing MongoDB connection...")
        await init_database()
        print("✅ MongoDB connection successful")
        
        print("\n🌱 Seeding LLM providers...")
        
        for provider_data in DEFAULT_PROVIDERS:
            # Check if provider already exists
            existing = await LLMProvider.find_one({"name": provider_data["name"]})
            
            if existing:
                print(f"  ℹ️  Provider '{provider_data['display_name']}' already exists (ID: {existing.id})")
                continue
            
            # Create new provider
            provider = LLMProvider(**provider_data)
            await provider.insert()
            print(f"  ✅ Created provider '{provider_data['display_name']}' (ID: {provider.id})")
        
        # List all providers
        print("\n📋 All LLM providers:")
        providers = await LLMProvider.find().to_list()
        for provider in providers:
            print(f"  - {provider.display_name} (name: {provider.name}, id: {provider.id})")
        
        print(f"\n🎉 Successfully seeded {len(providers)} LLM providers!")
        
    except Exception as e:
        print(f"\n❌ Error seeding providers: {e}")
        raise
    finally:
        await close_database()

def main():
    """Main function"""
    print("=" * 60)
    print("LLM Provider Seeding Script")
    print("=" * 60)
    print()
    
    try:
        asyncio.run(seed_providers())
        print()
        print("💡 Next steps:")
        print("   1. Start the backend server: python start_mongodb_dev.py")
        print("   2. Open the frontend and go to Settings > LLM Configuration")
        print("   3. Click 'Hinzufügen' to add a new LLM configuration")
        print("   4. The provider dropdown should now show options")
        print()
    except Exception as e:
        print(f"\n❌ Script failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()