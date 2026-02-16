from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..core import get_db, get_current_user, CurrentUser
from ..schemas import UserType
from ..crud import UserTypeCRUD
from ..core import user_types_cache, cached

router = APIRouter(prefix="/user-types", tags=["user-types"])


@router.get("", response_model=List[UserType])
@cached(user_types_cache)
async def list_user_types(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all user types (cached)."""
    user_types = await UserTypeCRUD.get_all(db)
    
    # TODO: Transform to response schema
    return []