import asyncio
from backend.core.database import AsyncSessionLocal
from backend.models import WorkflowTemplate
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(WorkflowTemplate))
        templates = result.scalars().all()
        print(f"TEMPLATES_COUNT:{len(templates)}")
        for t in templates:
            print(f"- {t.name} (id: {t.id})")

if __name__ == "__main__":
    asyncio.run(check())
