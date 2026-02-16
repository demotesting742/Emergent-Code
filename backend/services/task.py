from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Tuple
from uuid import UUID
from ..crud import TaskCRUD
from ..models import Task, TaskState
from .authorization import AuthorizationService


class TaskService:
    """Business logic for task operations."""
    
    @staticmethod
    async def create_task(
        db: AsyncSession,
        event_id: UUID,
        tasktype_id: UUID,
        label: str,
        description: str,
        user_id: UUID,
        workflow_instance_id: Optional[UUID] = None
    ) -> Task:
        """Create new task if user has access."""
        # Check scope
        if not await AuthorizationService.has_scope(db, user_id, event_id):
            raise ValueError("Not authorized to create tasks for this event")
        
        # Create task
        task = await TaskCRUD.create(
            db,
            event_id=event_id,
            tasktype_id=tasktype_id,
            workflow_instance_id=workflow_instance_id,
            created_by=user_id,
            label=label,
            description=description,
            state=TaskState.TODO
        )
        return task
    
    @staticmethod

    async def get_task(
        db: AsyncSession,
        task_id: UUID,
        user_id: UUID,
        usertype_id: UUID
    ) -> Optional[Task]:
        """Get task if user has access."""
        task = await TaskCRUD.get_by_id(db, task_id)
        if not task:
            return None
        
        # Check scope
        if not await AuthorizationService.has_scope(db, user_id, task.event_id):
            return None
        
        return task
    
    @staticmethod
    async def list_tasks(
        db: AsyncSession,
        user_id: UUID,
        usertype_id: UUID,
        event_id: Optional[UUID] = None
    ) -> List[Task]:
        """List tasks user can access."""
        # Get tasks
        tasks = await TaskCRUD.get_all(db, event_id)
        
        # Filter by scope
        accessible_tasks = []
        for task in tasks:
            if await AuthorizationService.has_scope(db, user_id, task.event_id):
                accessible_tasks.append(task)
        
        return accessible_tasks
    
    @staticmethod
    async def pick_task(
        db: AsyncSession,
        task_id: UUID,
        user_id: UUID,
        usertype_id: UUID
    ) -> Tuple[bool, Optional[str]]:
        """Pick (assign to self) a task."""
        task = await TaskCRUD.get_by_id(db, task_id)
        if not task:
            return False, "Task not found"
        
        # Check if can take
        if not await AuthorizationService.can_take_task(db, user_id, usertype_id, task):
            return False, "Not eligible to pick this task"
        
        # Check if already assigned
        if task.assignee_profile_id:
            return False, "Task already assigned"
        
        # TODO: Check parents done
        
        # Assign to user
        await TaskCRUD.assign_task(db, task_id, user_id, user_id)
        
        # Update state to ASSIGNED
        await TaskCRUD.update_state(db, task_id, TaskState.TODO, user_id)
        
        return True, None
    
    @staticmethod
    async def transition_task(
        db: AsyncSession,
        task_id: UUID,
        next_state: TaskState,
        user_id: UUID,
        usertype_id: UUID
    ) -> Tuple[bool, Optional[str]]:
        """Transition task to new state."""
        task = await TaskCRUD.get_by_id(db, task_id)
        if not task:
            return False, "Task not found"
        
        # Check permissions
        if not await AuthorizationService.can_transition_task(db, user_id, usertype_id, task):
            return False, "Not authorized to transition task"
        
        # Validate state transition
        valid = TaskService._validate_state_transition(task.state, next_state)
        if not valid:
            return False, f"Invalid transition from {task.state} to {next_state}"
        
        # Update state
        await TaskCRUD.update_state(db, task_id, next_state, user_id)
        
        # If transitioning to DONE, unlock children
        if next_state == TaskState.DONE:
            await TaskService._unlock_children(db, task_id)
        
        return True, None
    
    @staticmethod
    async def assign_task(
        db: AsyncSession,
        task_id: UUID,
        assignee_id: Optional[UUID],
        user_id: UUID,
        usertype_id: UUID
    ) -> Tuple[bool, Optional[str]]:
        """Assign or unassign task."""
        task = await TaskCRUD.get_by_id(db, task_id)
        if not task:
            return False, "Task not found"
        
        # Check permissions
        if not await AuthorizationService.can_assign_task(db, user_id, usertype_id, task):
            return False, "Not authorized to assign task"
        
        # TODO: Check assignee eligibility
        
        # Assign
        await TaskCRUD.assign_task(db, task_id, assignee_id, user_id)
        
        return True, None
    
    @staticmethod
    def _validate_state_transition(from_state: TaskState, to_state: TaskState) -> bool:
        """Validate state machine transitions."""
        # Define valid transitions
        valid_transitions = {
            TaskState.TODO: [TaskState.IN_PROGRESS],
            TaskState.IN_PROGRESS: [TaskState.DONE, TaskState.BLOCKED],
            TaskState.BLOCKED: [TaskState.IN_PROGRESS],
            TaskState.DONE: [],  # No transitions from DONE
            TaskState.CANCELLED: [],
        }
        
        allowed = valid_transitions.get(from_state, [])
        return to_state in allowed
    
    @staticmethod
    async def _unlock_children(db: AsyncSession, task_id: UUID):
        """Unlock child tasks when all parents are done."""
        # Get children
        children = await TaskCRUD.get_child_tasks(db, task_id)
        
        for child in children:
            # Check if all parents done
            parents = await TaskCRUD.get_parent_tasks(db, child.id)
            all_done = all(p.state == TaskState.DONE for p in parents)
            
            # If all parents done and child is BLOCKED, unlock to TODO
            if all_done and child.state == TaskState.BLOCKED:
                child.state = TaskState.TODO
                await db.commit()