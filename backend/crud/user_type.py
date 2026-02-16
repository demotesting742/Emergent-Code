from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from ..models import UserType


class UserTypeCRUD:
    """CRUD operations for user types."""
    
    @staticmethod
    async def get_by_id(db: AsyncSession, usertype_id: UUID) -> Optional[UserType]:
        """Get user type by ID."""
        result = await db.execute(
            select(UserType).where(UserType.id == usertype_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_by_name(db: AsyncSession, name: str) -> Optional[UserType]:
        """Get user type by name."""
        result = await db.execute(
            select(UserType).where(UserType.name == name)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_all(db: AsyncSession) -> List[UserType]:
        """Get all user types."""
        result = await db.execute(select(UserType))
        return result.scalars().all()
    
    @staticmethod
    async def create(db: AsyncSession, name: str) -> UserType:
        """Create new user type."""
        usertype = UserType(name=name)
        db.add(usertype)
        await db.commit()
        await db.refresh(usertype)
        return usertype