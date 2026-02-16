from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from ..core.database import Base


class TaskState(str, enum.Enum):
    """Task state enum matching DB task_state."""
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class Task(Base):
    """Task entity - maps to public.tasks."""
    
    __tablename__ = "tasks"
    __table_args__ = {"schema": "public"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_instance_id = Column(UUID(as_uuid=True), ForeignKey("public.workflow_instances.id", ondelete="CASCADE"), nullable=True)
    event_id = Column(UUID(as_uuid=True), ForeignKey("public.events.id", ondelete="CASCADE"), nullable=True)
    tasktype_id = Column(UUID(as_uuid=True), ForeignKey("public.task_types.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=True)
    assignee_profile_id = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=True)
    state = Column(Enum(TaskState, name="task_state"), default=TaskState.TODO)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)


class TaskDependency(Base):
    """Task dependency (DAG edges) - maps to public.task_dependencies."""
    
    __tablename__ = "task_dependencies"
    __table_args__ = {"schema": "public"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("public.tasks.id", ondelete="CASCADE"), nullable=False)
    depends_on_task_id = Column(UUID(as_uuid=True), ForeignKey("public.tasks.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TaskTransition(Base):
    """Task state transition history - maps to public.task_transitions."""
    
    __tablename__ = "task_transitions"
    __table_args__ = {"schema": "public"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("public.tasks.id", ondelete="CASCADE"), nullable=False)
    from_state = Column(Enum(TaskState, name="task_state"), nullable=True)
    to_state = Column(Enum(TaskState, name="task_state"), nullable=True)
    performed_by = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=True)
    performed_at = Column(DateTime(timezone=True), server_default=func.now())


class TaskAssignmentAudit(Base):
    """Task assignment audit trail - maps to public.task_assignments_audit."""
    
    __tablename__ = "task_assignments_audit"
    __table_args__ = {"schema": "public"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("public.tasks.id", ondelete="CASCADE"), nullable=True)
    old_assignee = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=True)
    new_assignee = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=True)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())