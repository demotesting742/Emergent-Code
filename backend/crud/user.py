from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from ..models import Profile


class UserCRUD:
    """CRUD operations for users."""
    
    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: UUID) -> Optional[Profile]:
        """Get user by ID."""
        result = await db.execute(
            select(Profile).where(Profile.id == user_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[Profile]:
        """Get user by email."""
        result = await db.execute(
            select(Profile).where(Profile.email == email)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_all(db: AsyncSession) -> List[Profile]:
        """Get all users."""
        result = await db.execute(select(Profile))
        return result.scalars().all()
    
    @staticmethod
    async def create(db: AsyncSession, email: str, display_name: Optional[str] = None) -> Profile:
        """Create new user."""
        user = Profile(email=email, display_name=display_name)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user