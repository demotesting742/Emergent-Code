from pydantic import BaseModel
from typing import Optional
from enum import Enum


class ActionResult(BaseModel):
    """Standard action result response."""
    ok: bool
    error: Optional[str] = None


class AccessLevel(str, Enum):
    """Access level enum."""
    admin = "admin"
    regular = "regular"


class TaskStateEnum(str, Enum):
    """Task state enum for API."""
    LOCKED = "LOCKED"
    TODO = "TODO"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"