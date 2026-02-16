from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Tuple
from uuid import UUID
from ..crud import EventCRUD, EventMemberCRUD
from ..models import Event

class EventService:
    """Business logic for event operations."""
    
    @staticmethod
    async def create_event(
        db: AsyncSession,
        name: str,
        user_id: UUID
    ) -> Event:
        """Create new event and add creator as member."""
        # Create event
        event = await EventCRUD.create(db, name, user_id)
        
        # Add creator as ADMIN member
        await EventMemberCRUD.add_member(db, event.id, user_id, "ADMIN")
        
        return event
