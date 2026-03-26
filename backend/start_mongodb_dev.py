#!/usr/bin/env python3
"""
MongoDB Development Startup Script
Tests connection and starts the FastAPI server
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

async def test_first():
    """Test MongoDB connection before starting server"""
    try:
        from app.db.session import init_database, close_database
        await init_database()
        await close_database()
        return True
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def main():
    """Main function"""
    print("=" * 60)
    print("MongoDB Development Server Starter")
    print("=" * 60)
    print()
    
    # Test MongoDB connection first
    print("🔍 Testing MongoDB connection...")
    success = asyncio.run(test_first())
    
    if not success:
        print("\n❌ Cannot start server - MongoDB connection failed!")
        print("\n💡 Please check:")
        print("   1. Your .env file contains correct MONGODB_URL")
        print("   2. MongoDB Atlas cluster is running")
        print("   3. Your IP is whitelisted in Atlas Network Access")
        print("   4. Database user credentials are correct")
        print("\n   Run: python test_mongodb_connection.py")
        sys.exit(1)
    
    print("✅ MongoDB connection successful!")
    print()
    print("🚀 Starting FastAPI server...")
    print("   API will be available at: http://localhost:8000")
    print("   Docs will be available at: http://localhost:8000/docs")
    print()
    
    # Import and run uvicorn
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()