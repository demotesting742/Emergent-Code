from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from ..models import TaskType, EligibilityMapping


class TaskTypeCRUD:
    """CRUD operations for task types."""
    
    @staticmethod
    async def get_by_id(db: AsyncSession, tasktype_id: UUID) -> Optional[TaskType]:
        """Get task type by ID."""
        result = await db.execute(
            select(TaskType).where(TaskType.id == tasktype_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_by_slug(db: AsyncSession, slug: str) -> Optional[TaskType]:
        """Get task type by slug."""
        result = await db.execute(
            select(TaskType).where(TaskType.slug == slug)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_all(db: AsyncSession) -> List[TaskType]:
        """Get all task types."""
        result = await db.execute(select(TaskType))
        return result.scalars().all()
    
    @staticmethod
    async def create(db: AsyncSession, name: str, slug: str) -> TaskType:
        """Create new task type."""
        tasktype = TaskType(name=name, slug=slug)
        db.add(tasktype)
        await db.commit()
        await db.refresh(tasktype)
        return tasktype


class EligibilityMappingCRUD:
    """CRUD operations for eligibility mappings."""
    
    @staticmethod
    async def get_all(db: AsyncSession) -> List[EligibilityMapping]:
        """Get all eligibility mappings."""
        result = await db.execute(select(EligibilityMapping))
        return result.scalars().all()
    
    @staticmethod
    async def is_eligible(db: AsyncSession, usertype_id: UUID, tasktype_id: UUID) -> bool:
        """Check if usertype is eligible for tasktype."""
        result = await db.execute(
            select(EligibilityMapping).where(
                EligibilityMapping.user_type_id == usertype_id,
                EligibilityMapping.task_type_id == tasktype_id
            )
        )
        return result.scalar_one_or_none() is not None
    
    @staticmethod
    async def create(db: AsyncSession, usertype_id: UUID, tasktype_id: UUID) -> EligibilityMapping:
        """Create eligibility mapping."""
        mapping = EligibilityMapping(user_type_id=usertype_id, task_type_id=tasktype_id)
        db.add(mapping)
        await db.commit()
        await db.refresh(mapping)
        return mapping
    
    @staticmethod
    async def delete(db: AsyncSession, usertype_id: UUID, tasktype_id: UUID) -> bool:
        """Delete eligibility mapping."""
        result = await db.execute(
            select(EligibilityMapping).where(
                EligibilityMapping.user_type_id == usertype_id,
                EligibilityMapping.task_type_id == tasktype_id
            )
        )
        mapping = result.scalar_one_or_none()
        if mapping:
            await db.delete(mapping)
            await db.commit()
            return True
        return False