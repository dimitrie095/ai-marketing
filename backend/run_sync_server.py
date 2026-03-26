"""
Run Synchronous Server
Starts the sync version of the API server
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

def check_dependencies():
    """Check if required packages are installed"""
    print("🔍 Checking dependencies...")
    
    required = ["fastapi", "uvicorn", "sqlalchemy", "dotenv"]
    
    for package in required:
        try:
            __import__(package)
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ❌ {package} not installed")
            print(f"     Install with: pip install {package}")
            return False
    
    # Check database drivers
    print("\n🔍 Checking database drivers...")
    drivers = ["psycopg2", "pg8000"]
    available = []
    
    for driver in drivers:
        try:
            __import__(driver)
            available.append(driver)
            print(f"  ✅ {driver} available")
        except ImportError:
            print(f"  ⚠️  {driver} not available")
    
    if not available:
        print("\n⚠️  No database driver found!")
        print("   Install one of:")
        print("   - pip install psycopg2-binary  (recommended)")
        print("   - pip install pg8000           (pure Python)")
        print("\n   The server will start but database will be disabled.")
        response = input("   Continue anyway? (y/n): ")
        if response.lower() != 'y':
            return False
    
    return True

def check_database():
    """Check database connection"""
    print("\n🔍 Checking database connection...")
    
    try:
        # Try to import sync session
        from app.db import session_sync
        
        if not session_sync.engine:
            print("  ⚠️  Database engine not created")
            print("     Check DATABASE_URL in .env file")
            return False
        
        # Test connection
        success = session_sync.test_connection()
        if success:
            print("  ✅ Database connection successful")
            return True
        else:
            print("  ❌ Database connection failed")
            return False
            
    except Exception as e:
        print(f"  ❌ Database check error: {e}")
        return False

def start_server():
    """Start the synchronous server"""
    print("\n" + "=" * 60)
    print("🚀 Starting Marketing Analytics AI (Sync Version)")
    print("=" * 60)
    
    # Load environment
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        from dotenv import load_dotenv
        load_dotenv()
        print(f"✅ Loaded environment from {env_file}")
    else:
        print("⚠️  No .env file found, using defaults")
    
    # Show database info
    db_url = os.getenv("DATABASE_URL", "not set")
    print(f"📊 Database URL: {db_url}")
    
    # Import and run
    import uvicorn
    
    print("\n🌐 Starting server...")
    print("   API: http://localhost:8000")
    print("   Docs: http://localhost:8000/docs")
    print("   Health: http://localhost:8000/health")
    print("\n📝 Press Ctrl+C to stop")
    print("=" * 60)
    
    uvicorn.run(
        "app.main_sync:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

def main():
    """Main function"""
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Dependencies missing")
        sys.exit(1)
    
    # Check database (optional)
    try:
        check_database()
    except:
        print("  ⚠️  Skipping database check due to errors")
    
    # Ask for confirmation
    print("\n" + "=" * 60)
    response = input("Start server? (y/n): ")
    
    if response.lower() in ['y', 'yes', '']:
        start_server()
    else:
        print("Server not started")
        sys.exit(0)

if __name__ == "__main__":
    main()
