from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from ..core import get_db, get_current_user, CurrentUser
from ..schemas import Task, TaskBase, TaskTransitionRequest, TaskAssignRequest, ActionResult
from ..services import TaskService
from ..models import TaskState

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskBase,
    eventId: str = Query(...),
    taskTypeId: str = Query(...),
    workflowInstanceId: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new task."""
    try:
        user_uuid = UUID(current_user.user_id)
        event_uuid = UUID(eventId)
        tasktype_uuid = UUID(taskTypeId)
        wf_uuid = UUID(workflowInstanceId) if workflowInstanceId else None
        
        task = await TaskService.create_task(
            db, 
            event_uuid, 
            tasktype_uuid, 
            task_in.label, 
            task_in.description, 
            user_uuid,
            wf_uuid
        )
        return task
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        print(f"DEBUG: Failed to create task: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}"
        )


@router.get("", response_model=List[Task])

async def list_tasks(
    eventId: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List tasks (filtered by event if provided)."""
    event_uuid = UUID(eventId) if eventId else None
    
    # TODO: Get usertype_id from profile
    usertype_id = None
    
    tasks = await TaskService.list_tasks(
        db, current_user.user_id, usertype_id, event_uuid
    )
    
    # TODO: Transform to response schema with parent_ids/child_ids
    return []


@router.get("/{taskId}", response_model=Task)
async def get_task(
    taskId: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get task by ID."""
    try:
        task_uuid = UUID(taskId)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid task ID format: {taskId}"
        )

    
    # TODO: Get usertype_id
    usertype_id = None
    
    task = await TaskService.get_task(
        db, task_uuid, current_user.user_id, usertype_id
    )
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # TODO: Transform to response schema
    return task


@router.post("/{taskId}/pick", response_model=ActionResult)
async def pick_task(
    taskId: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Pick (assign to self) a task."""
    try:
        task_uuid = UUID(taskId)
    except ValueError:
        return ActionResult(ok=False, error=f"Invalid task ID format: {taskId}")

    
    # TODO: Get usertype_id
    usertype_id = None
    
    success, error = await TaskService.pick_task(
        db, task_uuid, current_user.user_id, usertype_id
    )
    
    if not success:
        return ActionResult(ok=False, error=error or "Failed to pick task")
    
    return ActionResult(ok=True)


@router.post("/{taskId}/transition", response_model=ActionResult)
async def transition_task(
    taskId: str,
    body: TaskTransitionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Transition task to new state."""
    try:
        task_uuid = UUID(taskId)
    except ValueError:
        return ActionResult(ok=False, error=f"Invalid task ID format: {taskId}")

    
    # TODO: Get usertype_id
    usertype_id = None
    
    # Map schema enum to model enum
    next_state = TaskState[body.nextState.value]
    
    success, error = await TaskService.transition_task(
        db, task_uuid, next_state, current_user.user_id, usertype_id
    )
    
    if not success:
        return ActionResult(ok=False, error=error or "Failed to transition task")
    
    return ActionResult(ok=True)


@router.post("/{taskId}/assign", response_model=ActionResult)
async def assign_task(
    taskId: str,
    body: TaskAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Assign or unassign task."""
    try:
        task_uuid = UUID(taskId)
        assignee_uuid = UUID(body.userId) if body.userId else None
    except ValueError:
        return ActionResult(ok=False, error="Invalid task or assignee ID format")

    
    # TODO: Get usertype_id
    usertype_id = None
    
    success, error = await TaskService.assign_task(
        db, task_uuid, assignee_uuid, current_user.user_id, usertype_id
    )
    
    if not success:
        return ActionResult(ok=False, error=error or "Failed to assign task")
    
    return ActionResult(ok=True)