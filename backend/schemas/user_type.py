from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from .common import StrUUID


class PermissionsSchema(BaseModel):
    """Permissions schema (for future use)."""
    view: bool = True
    take: bool = False
    move_state: bool = False
    assign: bool = False


class UserTypeBase(BaseModel):
    """Base user type schema."""
    name: str


class UserType(UserTypeBase):
    """User type response schema."""
    id: StrUUID
    
    model_config = ConfigDict(from_attributes=True)