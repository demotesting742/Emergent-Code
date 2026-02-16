from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from ..core import get_db, get_current_user, CurrentUser
from ..schemas import Event, EventMember, User
from ..crud import EventCRUD, EventMemberCRUD

router = APIRouter(prefix="/events", tags=["events"])


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