from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime
from .common import StrUUID


class WorkflowNodeMetadata(BaseModel):
    """Workflow node metadata."""
    description: str = ""
    estimated_duration_hours: float = 0.0


class WorkflowNode(BaseModel):
    """Workflow node schema."""
    node_id: str
    task_type_id: str
    label: str = ""
    metadata: Optional[WorkflowNodeMetadata] = None


class WorkflowEdge(BaseModel):
    """Workflow edge schema."""
    from_node_id: str
    to_node_id: str


class WorkflowTemplateBase(BaseModel):
    """Base workflow template schema."""
    name: str


class WorkflowTemplate(WorkflowTemplateBase):
    """Workflow template response schema — aligned with ORM."""
    id: StrUUID
    created_by: Optional[StrUUID] = None
    created_at: Optional[datetime] = None
    nodes: List[WorkflowNode] = []
    edges: List[WorkflowEdge] = []
    
    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_model(cls, obj):
        """Build from ORM model, parsing JSONB columns into typed lists."""
        nodes = [WorkflowNode(**n) for n in (obj.nodes_json or [])]
        edges = [WorkflowEdge(**e) for e in (obj.edges_json or [])]
        return cls(
            id=str(obj.id),
            name=obj.name,
            created_by=str(obj.created_by) if obj.created_by else None,
            created_at=obj.created_at,
            nodes=nodes,
            edges=edges,
        )


class WorkflowTemplateInput(BaseModel):
    """Workflow template input for saving (includes nodes/edges not in DB model)."""
    name: str
    nodes: List[WorkflowNode] = []
    edges: List[WorkflowEdge] = []


class WorkflowInstance(BaseModel):
    """Workflow instance response schema."""
    id: StrUUID
    workflow_template_id: Optional[StrUUID] = None
    event_id: Optional[StrUUID] = None
    created_by: Optional[StrUUID] = None
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class WorkflowInstantiateRequest(BaseModel):
    """Workflow instantiation request — includes nodes/edges for task creation."""
    workflowId: str
    eventId: str
    nodes: List[WorkflowNode] = []
    edges: List[WorkflowEdge] = []


class WorkflowInstantiateResponse(BaseModel):
    """Workflow instantiation response."""
    ok: bool
    error: Optional[str] = None
    instanceId: Optional[str] = None