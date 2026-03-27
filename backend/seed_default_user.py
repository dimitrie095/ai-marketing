#!/usr/bin/env python3
"""
Seed script to create a default admin user
Usage: python seed_default_user.py
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

async def create_default_user():
    """Create a default admin user"""
    try:
        # Load environment variables from .env
        load_dotenv()
        # Import after loading environment
        from app.db import init_database, close_database
        from app.db.models import User
        from app.core.auth import pwd_context
        # Initialize database
        await init_database()
        
        # Check if admin user already exists
        existing_user = await User.find_one({"username": "admin"})
        if existing_user:
            print("Admin user already exists!")
            return False
        
        # Create admin user
        admin_user = User(
            username="admin",
            email="admin@example.com", 
            hashed_password=pwd_context.hash("admin123"),
            full_name="Administrator",
            is_active=True,
            is_superuser=True
        )
        
        await admin_user.save()
        print("✅ Default admin user created successfully!")
        print("Username: admin")
        print("Password: admin123") 
        print("Email: admin@example.com")
        print("\n⚠️  IMPORTANT: Change the password in production!")
        
        return True
        
    except Exception as e:
        print(f"Error creating default user: {e}")
        return False
    finally:
        await close_database()


if __name__ == "__main__":
    # Add parent directory to path
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    result = asyncio.run(create_default_user())
    sys.exit(0 if result else 1)