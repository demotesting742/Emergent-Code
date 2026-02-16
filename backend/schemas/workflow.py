from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime


class WorkflowNodeMetadata(BaseModel):
    """Workflow node metadata."""
    description: str
    estimated_duration_hours: float


class WorkflowNode(BaseModel):
    """Workflow node schema."""
    node_id: str
    task_type_id: str
    label: str
    metadata: WorkflowNodeMetadata


class WorkflowEdge(BaseModel):
    """Workflow edge schema."""
    from_node_id: str
    to_node_id: str


class WorkflowTemplateBase(BaseModel):
    """Base workflow template schema."""
    workflow_id: str
    name: str
    version: int
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]


class WorkflowTemplate(WorkflowTemplateBase):
    """Workflow template response schema."""
    
    model_config = ConfigDict(from_attributes=True)


class WorkflowInstance(BaseModel):
    """Workflow instance response schema."""
    id: str
    workflow_id: str
    event_id: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class WorkflowInstantiateRequest(BaseModel):
    """Workflow instantiation request."""
    workflowId: str
    eventId: str


class WorkflowInstantiateResponse(BaseModel):
    """Workflow instantiation response."""
    ok: bool
    error: Optional[str] = None
    instanceId: Optional[str] = None