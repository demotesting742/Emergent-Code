from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from ..core.database import Base


class WorkflowTemplate(Base):
    """Workflow template - maps to public.workflow_templates."""
    
    __tablename__ = "workflow_templates"
    __table_args__ = {"schema": "public"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    nodes_json = Column(JSONB, default=list)
    edges_json = Column(JSONB, default=list)


class WorkflowInstance(Base):
    """Workflow instance - maps to public.workflow_instances."""
    
    __tablename__ = "workflow_instances"
    __table_args__ = {"schema": "public"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_template_id = Column(UUID(as_uuid=True), ForeignKey("public.workflow_templates.id", ondelete="CASCADE"), nullable=True)
    event_id = Column(UUID(as_uuid=True), ForeignKey("public.events.id", ondelete="CASCADE"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())