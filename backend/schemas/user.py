from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema."""
    name: str
    email: EmailStr
    usertype_id: str
    avatar_url: Optional[str] = None


class User(UserBase):
    """User response schema."""
    id: str
    
    model_config = ConfigDict(from_attributes=True)