#!/usr/bin/env python3
"""
Seed Script - Ministry Admin Panel

Creates test users for all roles if they don't already exist.
Run this before first deployment or to reset test accounts.

Usage:
    python seed_users.py
"""

import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import bcrypt
from datetime import datetime, timezone
import uuid

load_dotenv(Path(__file__).parent / '.env')


# Test users configuration
TEST_USERS = [
    {
        "name": "System Admin",
        "email": "admin@ministry.local",
        "role": "Admin",
        "password": "ChangeMe123!"
    },
    {
        "name": "Content Editor",
        "email": "editor@ministry.local",
        "role": "Editor",
        "password": "ChangeMe123!"
    },
    {
        "name": "Video Producer",
        "email": "producer@ministry.local",
        "role": "Producer",
        "password": "ChangeMe123!"
    },
    {
        "name": "Content Approver",
        "email": "approver@ministry.local",
        "role": "Approver",
        "password": "ChangeMe123!"
    }
]


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


async def seed_users():
    """Create test users if they don't exist"""
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 50)
    print("Ministry Admin Panel - User Seed Script")
    print("=" * 50)
    print()
    
    created_count = 0
    existing_count = 0
    
    for user_data in TEST_USERS:
        # Check if user already exists
        existing = await db.users.find_one({"email": user_data["email"]})
        
        if existing:
            print(f"✓ {user_data['role']:10} - {user_data['email']} (already exists)")
            existing_count += 1
        else:
            # Create user
            user_doc = {
                "id": str(uuid.uuid4()),
                "name": user_data["name"],
                "email": user_data["email"],
                "role": user_data["role"],
                "is_active": True,
                "hashed_password": hash_password(user_data["password"]),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.users.insert_one(user_doc)
            print(f"+ {user_data['role']:10} - {user_data['email']} (created)")
            created_count += 1
    
    print()
    print("-" * 50)
    print(f"Created: {created_count}, Existing: {existing_count}")
    print()
    print("Test Credentials:")
    print("-" * 50)
    for user_data in TEST_USERS:
        print(f"  {user_data['role']:10} | {user_data['email']} | {user_data['password']}")
    print()
    
    client.close()


async def seed_avatars():
    """Create default avatars if they don't exist"""
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    default_avatars = [
        {"id": "avatar-1", "name": "Avatar 1", "display_name": "Host Alex", "is_active": True},
        {"id": "avatar-2", "name": "Avatar 2", "display_name": "Host Beth", "is_active": True},
        {"id": "avatar-3", "name": "Avatar 3", "display_name": "Host Chris", "is_active": True},
    ]
    
    print("Checking avatars...")
    
    for avatar in default_avatars:
        existing = await db.avatars.find_one({"id": avatar["id"]})
        if not existing:
            avatar["created_at"] = datetime.now(timezone.utc).isoformat()
            avatar["updated_at"] = datetime.now(timezone.utc).isoformat()
            avatar["has_photo"] = False
            await db.avatars.insert_one(avatar)
            print(f"+ Created avatar: {avatar['display_name']}")
        else:
            print(f"✓ Avatar exists: {avatar['id']}")
    
    client.close()


if __name__ == "__main__":
    print()
    asyncio.run(seed_users())
    print()
    asyncio.run(seed_avatars())
    print()
    print("Seed complete!")
