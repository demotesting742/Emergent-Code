from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from ..models import Event, EventMember, Profile


class EventCRUD:
    """CRUD operations for events."""
    
    @staticmethod
    async def get_by_id(db: AsyncSession, event_id: UUID) -> Optional[Event]:
        """Get event by ID."""
        result = await db.execute(
            select(Event).where(Event.id == event_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_all(db: AsyncSession) -> List[Event]:
        """Get all events."""
        result = await db.execute(select(Event))
        return result.scalars().all()
    
    @staticmethod
    async def get_user_events(db: AsyncSession, user_id: UUID) -> List[Event]:
        """Get all events where user is a member."""
        result = await db.execute(
            select(Event)
            .join(EventMember, EventMember.event_id == Event.id)
            .where(EventMember.profile_id == user_id)
        )
        return result.scalars().all()
    
    @staticmethod
    async def create(db: AsyncSession, name: str, created_by: Optional[UUID] = None) -> Event:
        """Create new event."""
        event = Event(name=name, created_by=created_by)
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event


class EventMemberCRUD:
    """CRUD operations for event members."""
    
    @staticmethod
    async def get_members(db: AsyncSession, event_id: UUID) -> List[EventMember]:
        """Get all members of an event with user details (preloaded)."""
        result = await db.execute(
            select(EventMember)
            .where(EventMember.event_id == event_id)
            .options(selectinload(EventMember.profile))
        )
        return result.scalars().all()
    
    @staticmethod
    async def is_member(db: AsyncSession, user_id: UUID, event_id: UUID) -> bool:
        """Check if user is member of event."""
        result = await db.execute(
            select(EventMember).where(
                EventMember.profile_id == user_id,
                EventMember.event_id == event_id
            )
        )
        return result.scalar_one_or_none() is not None
    
    @staticmethod
    async def add_member(db: AsyncSession, event_id: UUID, profile_id: UUID, role: Optional[str] = None) -> EventMember:
        """Add member to event."""
        member = EventMember(event_id=event_id, profile_id=profile_id, role=role)
        db.add(member)
        await db.commit()
        await db.refresh(member)
        return member
    
    @staticmethod
    async def remove_member(db: AsyncSession, event_id: UUID, profile_id: UUID) -> bool:
        """Remove member from event."""
        result = await db.execute(
            select(EventMember).where(
                EventMember.event_id == event_id,
                EventMember.profile_id == profile_id
            )
        )
        member = result.scalar_one_or_none()
        if member:
            await db.delete(member)
            await db.commit()
            return True
        return False