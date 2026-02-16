from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from ..models import WorkflowTemplate, WorkflowInstance


class WorkflowCRUD:
    """CRUD operations for workflows."""
    
    @staticmethod
    async def get_template_by_id(db: AsyncSession, template_id: UUID) -> Optional[WorkflowTemplate]:
        """Get workflow template by ID."""
        result = await db.execute(
            select(WorkflowTemplate).where(WorkflowTemplate.id == template_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_all_templates(db: AsyncSession) -> List[WorkflowTemplate]:
        """Get all workflow templates."""
        result = await db.execute(select(WorkflowTemplate))
        return result.scalars().all()
    
    @staticmethod
    async def create_template(db: AsyncSession, name: str, created_by: Optional[UUID] = None) -> WorkflowTemplate:
        """Create new workflow template."""
        template = WorkflowTemplate(name=name, created_by=created_by)
        db.add(template)
        await db.commit()
        await db.refresh(template)
        return template
    
    @staticmethod
    async def get_instance_by_id(db: AsyncSession, instance_id: UUID) -> Optional[WorkflowInstance]:
        """Get workflow instance by ID."""
        result = await db.execute(
            select(WorkflowInstance).where(WorkflowInstance.id == instance_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_instances(db: AsyncSession, event_id: Optional[UUID] = None) -> List[WorkflowInstance]:
        """Get workflow instances, optionally filtered by event."""
        query = select(WorkflowInstance)
        if event_id:
            query = query.where(WorkflowInstance.event_id == event_id)
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def create_instance(
        db: AsyncSession,
        workflow_template_id: UUID,
        event_id: UUID,
        created_by: Optional[UUID] = None
    ) -> WorkflowInstance:
        """Create new workflow instance."""
        instance = WorkflowInstance(
            workflow_template_id=workflow_template_id,
            event_id=event_id,
            created_by=created_by
        )
        db.add(instance)
        await db.commit()
        await db.refresh(instance)
        return instance