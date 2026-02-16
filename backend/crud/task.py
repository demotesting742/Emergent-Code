from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from ..models import Task, TaskDependency, TaskTransition, TaskState


class TaskCRUD:
    """CRUD operations for tasks with efficient loading."""
    
    @staticmethod
    async def get_by_id(db: AsyncSession, task_id: UUID) -> Optional[Task]:
        """Get task by ID."""
        result = await db.execute(
            select(Task).where(Task.id == task_id, Task.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_all(db: AsyncSession, event_id: Optional[UUID] = None) -> List[Task]:
        """Get all tasks, optionally filtered by event."""
        query = select(Task).where(Task.deleted_at.is_(None))
        if event_id:
            query = query.where(Task.event_id == event_id)
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_dependencies(db: AsyncSession, task_id: UUID) -> List[TaskDependency]:
        """Get task dependencies."""
        result = await db.execute(
            select(TaskDependency).where(TaskDependency.task_id == task_id)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_parent_tasks(db: AsyncSession, task_id: UUID) -> List[Task]:
        """Get parent tasks (dependencies)."""
        result = await db.execute(
            select(Task)
            .join(TaskDependency, TaskDependency.depends_on_task_id == Task.id)
            .where(TaskDependency.task_id == task_id)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_child_tasks(db: AsyncSession, task_id: UUID) -> List[Task]:
        """Get child tasks (dependents)."""
        result = await db.execute(
            select(Task)
            .join(TaskDependency, TaskDependency.task_id == Task.id)
            .where(TaskDependency.depends_on_task_id == task_id)
        )
        return result.scalars().all()
    
    @staticmethod
    async def update_state(db: AsyncSession, task_id: UUID, new_state: TaskState, performed_by: UUID) -> Task:
        """Update task state and record transition."""
        task = await TaskCRUD.get_by_id(db, task_id)
        if not task:
            raise ValueError("Task not found")
        
        old_state = task.state
        task.state = new_state
        
        # Record transition
        transition = TaskTransition(
            task_id=task_id,
            from_state=old_state,
            to_state=new_state,
            performed_by=performed_by
        )
        db.add(transition)
        
        await db.commit()
        await db.refresh(task)
        return task
    
    @staticmethod
    async def assign_task(db: AsyncSession, task_id: UUID, assignee_id: Optional[UUID], changed_by: UUID) -> Task:
        """Assign or unassign task."""
        task = await TaskCRUD.get_by_id(db, task_id)
        if not task:
            raise ValueError("Task not found")
        
        old_assignee = task.assignee_profile_id
        task.assignee_profile_id = assignee_id
        
        # TODO: Record in audit table
        
        await db.commit()
        await db.refresh(task)
        return task
    
    @staticmethod
    async def create(db: AsyncSession, **kwargs) -> Task:
        """Create new task."""
        task = Task(**kwargs)
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task
    
    @staticmethod
    async def create_dependency(db: AsyncSession, task_id: UUID, depends_on_task_id: UUID) -> TaskDependency:
        """Create task dependency."""
        dep = TaskDependency(task_id=task_id, depends_on_task_id=depends_on_task_id)
        db.add(dep)
        await db.commit()
        await db.refresh(dep)
        return dep