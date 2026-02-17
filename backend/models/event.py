from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..core.database import Base


class Event(Base):
    """Event entity - maps to public.events."""
    
    __tablename__ = "events"
    __table_args__ = {"schema": "public"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EventMember(Base):
    """Event membership - maps to public.event_members."""
    
    __tablename__ = "event_members"
    __table_args__ = {"schema": "public"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("public.events.id", ondelete="CASCADE"), nullable=False)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    role = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    profile = relationship("Profile", foreign_keys=[profile_id], lazy="noload")