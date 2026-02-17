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
            has_nodes = t.nodes_json is not None
            num_nodes = len(t.nodes_json) if has_nodes else 0
            print(f"- {t.name} | nodes: {num_nodes} | edges: {len(t.edges_json) if t.edges_json else 0}")

if __name__ == "__main__":
    asyncio.run(check())
