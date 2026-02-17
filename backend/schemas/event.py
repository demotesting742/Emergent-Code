from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from .common import StrUUID


class EventBase(BaseModel):
    """Base event schema."""
    name: str


class Event(EventBase):
    """Event response schema."""
    id: StrUUID
    created_by: Optional[StrUUID] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class EventMemberBase(BaseModel):
    """Base event member schema."""
    profile_id: StrUUID
    event_id: StrUUID


class EventMember(EventMemberBase):
    """Event member response schema."""
    id: StrUUID
    role: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)