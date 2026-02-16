from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from ..core.database import Base


class Profile(Base):
    """User profile - maps to public.profiles."""
    
    __tablename__ = "profiles"
    __table_args__ = {"schema": "public"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, unique=True, nullable=False)
    display_name = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())