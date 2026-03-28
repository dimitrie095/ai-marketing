#!/usr/bin/env python3
"""
Create DeepSeek LLM Configuration Script
Creates a test LLM configuration for DeepSeek directly in MongoDB
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime
from decimal import Decimal

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

# Load environment variables
load_dotenv()

from app.db.models_llm import LLMProvider, LLMConfig
from app.db.session import init_database, close_database

async def create_deepseek_config():
    """Create a DeepSeek LLM configuration directly in MongoDB"""
    
    deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
    if not deepseek_api_key or deepseek_api_key == "your_deepseek_key" or len(deepseek_api_key) < 10:
        print("❌ DEEPSEEK_API_KEY not found or invalid in .env file")
        return False
    
    print("🔑 Using DeepSeek API Key from .env")
    
    try:
        # Initialize DB connection
        await init_database()
        
        # Verify DeepSeek provider exists
        deepseek_provider = await LLMProvider.find_one({"id": 2})
        if not deepseek_provider:
            print("❌ DeepSeek provider not found. Please run seed_llm_providers.py first.")
            return False
        
        print(f"✅ Found DeepSeek provider: {deepseek_provider.display_name}")
        
        # Check if DeepSeek config already exists
        existing_config = await LLMConfig.find_one({"provider_id": 2})
        if existing_config:
            print(f"ℹ️  DeepSeek configuration already exists (ID: {existing_config.id})")
            print(f"   Name: {existing_config.name}")
            print(f"   Model: {existing_config.model_name}")
            return True
        
        # Get next available ID
        last_config = await LLMConfig.find().sort(-LLMConfig.id).limit(1).to_list()
        next_id = 1 if not last_config else last_config[0].id + 1
        
        # Create new DeepSeek configuration
        config = LLMConfig(
            id=next_id,
            name="DeepSeek Test Config",
            provider_id=2,  # DeepSeek provider ID
            model_name="deepseek-chat",
            api_key_encrypted=deepseek_api_key,  # TODO: Implement encryption
            max_tokens=4096,
            temperature=Decimal("0.7"),
            top_p=Decimal("1.0"),
            is_active=True,
            is_default=False,
            cost_per_1k_input_tokens=Decimal("0.0007"),
            cost_per_1k_output_tokens=Decimal("0.0007"),
            created_at=datetime.utcnow()
        )
        
        await config.insert()
        
        print(f"✅ DeepSeek configuration created successfully!")
        print(f"   ID: {config.id}")
        print(f"   Name: {config.name}")
        print(f"   Model: {config.model_name}")
        print(f"   Status: {'Active' if config.is_active else 'Inactive'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating configuration: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await close_database()

async def list_configs():
    """List all existing LLM configurations"""
    try:
        await init_database()
        
        configs = await LLMConfig.find().to_list()
        
        if configs:
            print("\n📋 Existing LLM configurations:")
            for config in configs:
                provider = await LLMProvider.find_one({"id": config.provider_id})
                provider_name = provider.display_name if provider else f"Unknown ({config.provider_id})"
                print(f"   - {config.name} (ID: {config.id}, Provider: {provider_name}, Model: {config.model_name})")
        else:
            print("\n📋 No LLM configurations found")
            
        return configs
        
    except Exception as e:
        print(f"❌ Error listing configurations: {e}")
        return []
    finally:
        await close_database()

def main():
    """Main function"""
    print("=" * 60)
    print("Create DeepSeek LLM Configuration")
    print("=" * 60)
    print()
    
    try:
        # First list existing configs
        existing_configs = asyncio.run(list_configs())
        
        # Check if DeepSeek config already exists
        deepseek_exists = any(
            config.provider_id == 2 for config in existing_configs
        )
        
        if deepseek_exists:
            print("\nℹ️  DeepSeek configuration already exists. Skipping creation.")
            print("\n🎉 DeepSeek configuration is ready to use!")
        else:
            # Create new DeepSeek config
            success = asyncio.run(create_deepseek_config())
            
            if success:
                print("\n🎉 DeepSeek configuration created successfully!")
            else:
                print("\n❌ Failed to create DeepSeek configuration")
                sys.exit(1)
        
        print()
        print("💡 Next steps:")
        print("   1. Open the frontend and go to Settings > LLM Configuration")
        print("   2. You should see the DeepSeek configuration in the list")
        print("   3. You can also add more configurations using the 'Hinzufügen' button")
        print("   4. The provider dropdown should now show OpenAI, DeepSeek, and Kimi options")
        print()
        
    except Exception as e:
        print(f"\n❌ Script failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()