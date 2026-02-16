from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from ..schemas.common import TaskStateEnum


class TaskBase(BaseModel):
    """Base task schema."""
    label: str
    description: str


class Task(BaseModel):
    """Task response schema."""
    id: str
    workflow_instance_id: str
    event_id: str
    node_id: str
    tasktype_id: str
    label: str
    description: str
    state: TaskStateEnum
    assignee_id: Optional[str] = None
    parent_ids: List[str]
    child_ids: List[str]
    
    model_config = ConfigDict(from_attributes=True)


class TaskTransitionRequest(BaseModel):
    """Task state transition request."""
    nextState: TaskStateEnum


class TaskAssignRequest(BaseModel):
    """Task assignment request."""
    userId: Optional[str] = None