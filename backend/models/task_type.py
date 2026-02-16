from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from ..core.database import Base


class TaskType(Base):
    """Task type - maps to public.task_types."""
    
    __tablename__ = "task_types"
    __table_args__ = {"schema": "public"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(Text, unique=True, nullable=False)
    name = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EligibilityMapping(Base):
    """UserType to TaskType eligibility - maps to public.eligibility_mappings."""
    
    __tablename__ = "eligibility_mappings"
    __table_args__ = {"schema": "public"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_type_id = Column(UUID(as_uuid=True), ForeignKey("public.task_types.id", ondelete="CASCADE"), nullable=True)
    user_type_id = Column(UUID(as_uuid=True), ForeignKey("public.user_types.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())