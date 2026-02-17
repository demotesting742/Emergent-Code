from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from .common import StrUUID


class UserBase(BaseModel):
    """Base user schema."""
    email: str
    display_name: Optional[str] = None


class User(UserBase):
    """User response schema."""
    id: StrUUID
    
    model_config = ConfigDict(from_attributes=True)