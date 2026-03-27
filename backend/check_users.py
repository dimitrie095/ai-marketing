#!/usr/bin/env python3
"""
Check existing users in database
"""
import asyncio
import sys
import os
sys.path.append('.')
from dotenv import load_dotenv
load_dotenv()
from app.db.session import init_database, close_database
from app.db.models import User

async def main():
    await init_database()
    print("Existing users:")
    users = await User.find_all().to_list()
    for u in users:
        print(f"  username={u.username} email={u.email} is_superuser={u.is_superuser}")
    # Check for admin user
    admin = await User.find_one({"username": "admin"})
    if admin:
        print(f"\nAdmin user found: {admin.username} ({admin.email})")
    else:
        print("\nNo admin user found.")
    await close_database()

if __name__ == "__main__":
    asyncio.run(main())