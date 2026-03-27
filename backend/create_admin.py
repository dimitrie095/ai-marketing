#!/usr/bin/env python3
"""
Create admin user using bcrypt directly
"""
import asyncio
import sys
import os
import bcrypt
sys.path.append('.')
from dotenv import load_dotenv
load_dotenv()
from app.db.session import init_database, close_database
from app.db.models import User

async def main():
    await init_database()
    # Check if admin exists
    admin = await User.find_one({"username": "admin"})
    if admin:
        print("Admin user already exists!")
        await close_database()
        return
    
    # Hash password with bcrypt
    password = "admin123"
    # bcrypt expects bytes
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    # Convert to string (bcrypt returns bytes)
    hashed_str = hashed.decode('utf-8')
    
    # Create user
    admin_user = User(
        username="admin",
        email="admin@example.com",
        hashed_password=hashed_str,
        full_name="Administrator",
        is_active=True,
        is_superuser=True
    )
    await admin_user.save()
    print("✅ Admin user created successfully!")
    print(f"Username: admin")
    print(f"Password: {password}")
    print(f"Email: admin@example.com")
    await close_database()

if __name__ == "__main__":
    asyncio.run(main())