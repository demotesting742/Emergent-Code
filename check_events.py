import asyncio
from backend.core.database import AsyncSessionLocal
from backend.models import Event
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Event))
        events = result.scalars().all()
        print(f"EVENTS_COUNT:{len(events)}")
        for e in events:
            print(f"- {e.name} (id: {e.id})")

if __name__ == "__main__":
    asyncio.run(check())
