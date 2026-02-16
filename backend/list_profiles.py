import asyncio
import os
import sys

# Ensure backend package is in path
sys.path.append(os.getcwd())

from backend.core.database import AsyncSessionLocal
from backend.models.user import Profile
from sqlalchemy import select

async def list_profiles():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Profile))
        profiles = result.scalars().all()
        print(f"Total profiles: {len(profiles)}")
        for p in profiles:
            print(f"ID: {p.id}, Email: {p.email}, Name: {p.display_name}")

if __name__ == "__main__":
    asyncio.run(list_profiles())
