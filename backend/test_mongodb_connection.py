#!/usr/bin/env python3
"""
MongoDB Connection Test Script
Tests connection to MongoDB Atlas (or local MongoDB)
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

async def test_mongodb_connection():
    """Test MongoDB connection"""
    print("🔍 Testing MongoDB Connection...")
    print(f"MONGODB_URL: {os.getenv('MONGODB_URL', 'Not set')}")
    print(f"DATABASE_NAME: {os.getenv('DATABASE_NAME', 'Not set')}")
    print()
    
    try:
        # Import MongoDB setup
        from app.db.session import init_database, close_database
        
        # Initialize connection
        await init_database()
        
        # Test basic operations
        from app.db import Campaign, AdSet, Ad, Metric
        
        print("\n📊 Testing collection access...")
        
        # Count documents in each collection (should return 0 for new DB)
        campaign_count = await Campaign.count()
        adset_count = await AdSet.count()
        ad_count = await Ad.count()
        metric_count = await Metric.count()
        
        print(f"✅ Campaigns collection: {campaign_count} documents")
        print(f"✅ AdSets collection: {adset_count} documents")
        print(f"✅ Ads collection: {ad_count} documents")
        print(f"✅ Metrics collection: {metric_count} documents")
        
        print("\n🎉 MongoDB connection test successful!")
        print("\n💡 To use with MongoDB Atlas:")
        print("   1. Get your connection string from MongoDB Atlas")
        print("   2. Update MONGODB_URL in your .env file:")
        print("      MONGODB_URL=mongodb+srv://username:password@cluster0.mongodb.net/marketing_ai")
        print("   3. Make sure your IP is whitelisted in Atlas Network Access")
        print("   4. Run this test again")
        
        # Close connection
        await close_database()
        
        return True
        
    except Exception as e:
        print(f"\n❌ MongoDB connection failed!")
        print(f"Error: {e}")
        print("\n💡 Troubleshooting tips:")
        print("   1. Check your MONGODB_URL in .env file")
        print("   2. Make sure MongoDB is running locally (if using localhost)")
        print("   3. For MongoDB Atlas, check:")
        print("      - Connection string format")
        print("      - Network Access IP whitelist")
        print("      - Username/password correct")
        print("      - Database user has proper permissions")
        print("   4. Check internet connection (for Atlas)")
        return False

def test_mongodb_url_format():
    """Validate MongoDB URL format"""
    mongodb_url = os.getenv('MONGODB_URL', '')
    
    print("🔍 Validating MongoDB URL format...")
    
    if not mongodb_url:
        print("❌ MONGODB_URL is not set in .env file")
        return False
    
    if mongodb_url.startswith('mongodb://') or mongodb_url.startswith('mongodb+srv://'):
        print(f"✅ URL format appears correct: {mongodb_url[:30]}...")
        return True
    else:
        print(f"❌ URL format invalid: {mongodb_url}")
        print("   Must start with 'mongodb://' or 'mongodb+srv://'")
        return False

if __name__ == "__main__":
    # Test URL format first
    if not test_mongodb_url_format():
        sys.exit(1)
    
    # Test actual connection
    success = asyncio.run(test_mongodb_connection())
    sys.exit(0 if success else 1)