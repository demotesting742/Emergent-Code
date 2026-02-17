from pydantic import BaseModel, BeforeValidator
from typing import Optional, Annotated, Any
from enum import Enum
from uuid import UUID


def _uuid_to_str(v: Any) -> str:
    """Convert UUID objects to strings for API responses.
    
    SQLAlchemy's UUID(as_uuid=True) columns return Python uuid.UUID objects.
    Pydantic v2 strict validation rejects these where 'str' is expected.
    This validator runs before type checking and converts UUID -> str.
    """
    if isinstance(v, UUID):
        return str(v)
    return v


def safe_uuid(v: Any) -> Optional[UUID]:
    """Safely convert a value to a UUID, returning None if invalid."""
    if not v:
        return None
    if isinstance(v, UUID):
        return v
    try:
        return UUID(str(v))
    except (ValueError, TypeError):
        return None


# Annotated type that accepts both str and UUID, converting UUID to str
StrUUID = Annotated[str, BeforeValidator(_uuid_to_str)]


class ActionResult(BaseModel):
    """Standard action result response."""
    ok: bool
    error: Optional[str] = None


class AccessLevel(str, Enum):
    """Access level enum."""
    admin = "admin"
    regular = "regular"


class TaskStateEnum(str, Enum):
    """Task state enum for API — must match DB task_state enum."""
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    DONE = "DONE"
    CANCELLED = "CANCELLED"