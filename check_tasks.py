import asyncio
from backend.core.database import AsyncSessionLocal
from backend.models import Task
from sqlalchemy import select, func

async def check():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count(Task.id)))
        count = result.scalar()
        print(f"TASK_COUNT:{count}")

if __name__ == "__main__":
    asyncio.run(check())
