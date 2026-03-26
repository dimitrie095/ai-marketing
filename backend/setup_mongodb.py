#!/usr/bin/env python3
"""
Setup MongoDB Environment
Removes PostgreSQL dependencies and installs MongoDB dependencies
"""

import subprocess
import sys

def run_command(command, description):
    """Run a shell command and handle errors"""
    print(f"📦 {description}...")
    print(f"   $ {command}")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"   ✅ Success")
            return True
        else:
            print(f"   ❌ Failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    """Main setup process"""
    print("=" * 60)
    print("MongoDB Environment Setup")
    print("=" * 60)
    print()
    
    # Step 1: Uninstall old PostgreSQL packages
    print("🧹 Step 1: Removing old PostgreSQL packages...")
    old_packages = [
        "sqlalchemy",
        "alembic", 
        "asyncpg",
        "psycopg2-binary",
        "psycopg2",
        "pg8000"
    ]
    
    for package in old_packages:
        run_command(f"pip uninstall -y {package}", f"Uninstalling {package}")
    print()
    
    # Step 2: Install new MongoDB packages
    print("⬇️  Step 2: Installing MongoDB packages...")
    packages = [
        "motor==3.7.0",
        "beanie==1.29.0", 
        "pymongo==4.11.0"
    ]
    
    for package in packages:
        success = run_command(f"pip install {package}", f"Installing {package}")
        if not success:
            print(f"\n❌ Failed to install {package}")
            print("💡 Try running: pip install --upgrade pip")
            sys.exit(1)
    print()
    
    # Step 3: Verify installation
    print("✅ Step 3: Verifying installation...")
    success = run_command(
        "python -c \"import motor, beanie, pymongo; print(f'motor: 3.7.0'); print(f'beanie: {beanie.__version__}'); print(f'pymongo: {pymongo.__version__}')\"", 
        "Checking versions"
    )
    
    if success:
        print()
        print("🎉 MongoDB environment setup successful!")
        print()
        print("💡 Next steps:")
        print("   1. Configure your .env file with MongoDB Atlas connection string")
        print("   2. Test connection: python test_mongodb_connection.py")
        print("   3. Start server: python start_mongodb_dev.py")
        print()
    else:
        print()
        print("❌ Verification failed")
        print("💡 Try installing packages manually:")
        print("   pip install motor==3.7.0 beanie==1.29.0 pymongo==4.11.0")
        sys.exit(1)

if __name__ == "__main__":
    main()