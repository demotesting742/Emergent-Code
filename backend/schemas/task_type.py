from pydantic import BaseModel, ConfigDict
from typing import Optional
from .common import StrUUID


class TaskTypeBase(BaseModel):
    """Base task type schema."""
    name: str


class TaskType(TaskTypeBase):
    """Task type response schema."""
    id: StrUUID
    slug: str
    
    model_config = ConfigDict(from_attributes=True)


class EligibilityMappingBase(BaseModel):
    """Base eligibility mapping schema."""
    user_type_id: Optional[StrUUID] = None
    task_type_id: Optional[StrUUID] = None


class EligibilityMapping(EligibilityMappingBase):
    """Eligibility mapping response schema."""
    id: StrUUID
    
    model_config = ConfigDict(from_attributes=True)