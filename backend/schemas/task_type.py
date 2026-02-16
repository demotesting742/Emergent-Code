from pydantic import BaseModel, ConfigDict


class TaskTypeBase(BaseModel):
    """Base task type schema."""
    name: str


class TaskType(TaskTypeBase):
    """Task type response schema."""
    id: str
    
    model_config = ConfigDict(from_attributes=True)


class EligibilityMappingBase(BaseModel):
    """Base eligibility mapping schema."""
    usertype_id: str
    tasktype_id: str


class EligibilityMapping(EligibilityMappingBase):
    """Eligibility mapping response schema."""
    
    model_config = ConfigDict(from_attributes=True)