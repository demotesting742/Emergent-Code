from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..core import get_db, get_current_user, CurrentUser
from ..schemas import User
from ..crud import UserCRUD

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[User])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all users."""
    users = await UserCRUD.get_all(db)
    
    # TODO: Transform to response schema
    return []