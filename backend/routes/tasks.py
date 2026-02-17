from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from ..core import get_db, get_current_user, CurrentUser
from ..schemas import Task, TaskBase, TaskTransitionRequest, TaskAssignRequest, ActionResult
from ..schemas.common import safe_uuid
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
        user_uuid = safe_uuid(current_user.user_id)
        event_uuid = safe_uuid(eventId)
        tasktype_uuid = safe_uuid(taskTypeId)
        wf_uuid = safe_uuid(workflowInstanceId) if workflowInstanceId else None
        
        if not user_uuid:
            raise HTTPException(status_code=400, detail=f"Invalid user ID: {current_user.user_id}")
        if not event_uuid:
            raise HTTPException(status_code=400, detail=f"Invalid event ID: {eventId}")
        if not tasktype_uuid:
            raise HTTPException(status_code=400, detail=f"Invalid task type ID: {taskTypeId}")
        if workflowInstanceId and not wf_uuid:
            raise HTTPException(status_code=400, detail=f"Invalid workflow instance ID: {workflowInstanceId}")
        
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
    event_uuid = safe_uuid(eventId) if eventId else None
    if eventId and not event_uuid:
        raise HTTPException(status_code=400, detail=f"Invalid event ID: {eventId}")
    
    user_uuid = safe_uuid(current_user.user_id)
    if not user_uuid:
        raise HTTPException(status_code=400, detail=f"Invalid user ID: {current_user.user_id}")
    
    # TODO: Get usertype_id from profile
    usertype_id = None
    
    tasks = await TaskService.list_tasks(
        db, user_uuid, usertype_id, event_uuid
    )
    
    return tasks


@router.get("/{taskId}", response_model=Task)
async def get_task(
    taskId: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get task by ID."""
    task_uuid = safe_uuid(taskId)
    if not task_uuid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid task ID format: {taskId}"
        )

    user_uuid = safe_uuid(current_user.user_id)
    if not user_uuid:
        raise HTTPException(status_code=400, detail=f"Invalid user ID: {current_user.user_id}")
    # TODO: Get usertype_id
    usertype_id = None
    
    task = await TaskService.get_task(
        db, task_uuid, user_uuid, usertype_id
    )
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    return task


@router.post("/{taskId}/pick", response_model=ActionResult)
async def pick_task(
    taskId: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Pick (assign to self) a task."""
    task_uuid = safe_uuid(taskId)
    if not task_uuid:
        return ActionResult(ok=False, error=f"Invalid task ID format: {taskId}")

    user_uuid = safe_uuid(current_user.user_id)
    if not user_uuid:
        return ActionResult(ok=False, error=f"Invalid user ID: {current_user.user_id}")
    # TODO: Get usertype_id
    usertype_id = None
    
    success, error = await TaskService.pick_task(
        db, task_uuid, user_uuid, usertype_id
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
    task_uuid = safe_uuid(taskId)
    if not task_uuid:
        return ActionResult(ok=False, error=f"Invalid task ID format: {taskId}")

    user_uuid = safe_uuid(current_user.user_id)
    if not user_uuid:
        return ActionResult(ok=False, error=f"Invalid user ID: {current_user.user_id}")
    # TODO: Get usertype_id
    usertype_id = None
    
    # Map schema enum to model enum
    next_state = TaskState[body.nextState.value]
    
    success, error = await TaskService.transition_task(
        db, task_uuid, next_state, user_uuid, usertype_id
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
    task_uuid = safe_uuid(taskId)
    assignee_uuid = safe_uuid(body.userId) if body.userId else None
    
    if not task_uuid:
        return ActionResult(ok=False, error="Invalid task ID format")
    if body.userId and not assignee_uuid:
        return ActionResult(ok=False, error="Invalid assignee ID format")

    user_uuid = safe_uuid(current_user.user_id)
    if not user_uuid:
        return ActionResult(ok=False, error=f"Invalid user ID: {current_user.user_id}")
    # TODO: Get usertype_id
    usertype_id = None
    
    success, error = await TaskService.assign_task(
        db, task_uuid, assignee_uuid, user_uuid, usertype_id
    )
    
    if not success:
        return ActionResult(ok=False, error=error or "Failed to assign task")
    
    return ActionResult(ok=True)