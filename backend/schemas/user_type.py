from pydantic import BaseModel, ConfigDict
from typing import Dict
from ..schemas.common import AccessLevel


class PermissionsSchema(BaseModel):
    """Permissions schema."""
    view: bool
    take: bool
    move_state: bool
    assign: bool


class UserTypeBase(BaseModel):
    """Base user type schema."""
    name: str
    access_level: AccessLevel
    permissions: PermissionsSchema


class UserType(UserTypeBase):
    """User type response schema."""
    id: str
    
    model_config = ConfigDict(from_attributes=True)