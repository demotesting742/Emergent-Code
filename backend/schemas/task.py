from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from .common import TaskStateEnum, StrUUID


class TaskBase(BaseModel):
    """Base task schema for creation."""
    label: str = ""
    description: str = ""


class Task(BaseModel):
    """Task response schema — aligned with ORM Task model."""
    id: StrUUID
    workflow_instance_id: Optional[StrUUID] = None
    event_id: Optional[StrUUID] = None
    tasktype_id: Optional[StrUUID] = None
    created_by: Optional[StrUUID] = None
    assignee_profile_id: Optional[StrUUID] = None
    state: Optional[TaskStateEnum] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class TaskTransitionRequest(BaseModel):
    """Task state transition request."""
    nextState: TaskStateEnum


class TaskAssignRequest(BaseModel):
    """Task assignment request."""
    userId: Optional[str] = None