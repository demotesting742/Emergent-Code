from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class EventBase(BaseModel):
    """Base event schema."""
    name: str
    description: str


class Event(EventBase):
    """Event response schema."""
    id: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class EventMemberBase(BaseModel):
    """Base event member schema."""
    user_id: str
    event_id: str


class EventMember(EventMemberBase):
    """Event member response schema."""
    user: Optional["User"] = None
    
    model_config = ConfigDict(from_attributes=True)


from .user import User
EventMember.model_rebuild()