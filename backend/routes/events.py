from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from ..core import get_db, get_current_user, CurrentUser
from ..schemas import Event, EventMember, EventBase
from ..schemas.common import safe_uuid
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
        user_uuid = safe_uuid(current_user.user_id)
        if not user_uuid:
            raise HTTPException(status_code=400, detail=f"Invalid user ID: {current_user.user_id}")
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
    events = await EventCRUD.get_all(db)
    return events


@router.get("/{eventId}", response_model=Event)
async def get_event(
    eventId: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get event by ID."""
    event_uuid = safe_uuid(eventId)
    if not event_uuid:
        raise HTTPException(status_code=400, detail=f"Invalid event ID: {eventId}")
    event = await EventCRUD.get_by_id(db, event_uuid)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    return event


@router.put("/{eventId}", response_model=Event)
async def update_event(
    eventId: str,
    event_in: EventBase,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update event by ID."""
    event_uuid = safe_uuid(eventId)
    if not event_uuid:
        raise HTTPException(status_code=400, detail=f"Invalid event ID: {eventId}")
    event = await EventCRUD.get_by_id(db, event_uuid)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    event.name = event_in.name
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/{eventId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    eventId: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete event by ID."""
    event_uuid = safe_uuid(eventId)
    if not event_uuid:
        raise HTTPException(status_code=400, detail=f"Invalid event ID: {eventId}")
    event = await EventCRUD.get_by_id(db, event_uuid)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    await db.delete(event)
    await db.commit()


@router.get("/{eventId}/members", response_model=List[EventMember])
async def list_event_members(
    eventId: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List members of an event."""
    event_uuid = safe_uuid(eventId)
    if not event_uuid:
        raise HTTPException(status_code=400, detail=f"Invalid event ID: {eventId}")
    members = await EventMemberCRUD.get_members(db, event_uuid)
    return members