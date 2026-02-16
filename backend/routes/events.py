from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from ..core import get_db, get_current_user, CurrentUser
from ..schemas import Event, EventMember, User, EventBase
from ..crud import EventCRUD, EventMemberCRUD
from ..services import EventService

router = APIRouter(prefix="/events", tags=["events"])


@router.post("", response_model=Event, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_in: EventBase,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new event."""
    try:
        user_uuid = UUID(current_user.user_id)
        event = await EventService.create_event(db, event_in.name, user_uuid)
        return event
    except Exception as e:
        print(f"DEBUG: Failed to create event: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create event: {str(e)}"
        )


@router.get("", response_model=List[Event])

async def list_events(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all events user can access."""
    # TODO: Filter by scope (admin sees all, regular sees only their events)
    events = await EventCRUD.get_all(db)
    return events


@router.get("/{eventId}/members", response_model=List[EventMember])
async def list_event_members(
    eventId: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List members of an event."""
    event_uuid = UUID(eventId)
    
    # TODO: Check scope
    
    members = await EventMemberCRUD.get_members(db, event_uuid)
    
    # TODO: Transform to include user details
    return members