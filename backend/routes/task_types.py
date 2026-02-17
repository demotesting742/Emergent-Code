from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..core import get_db, get_current_user, CurrentUser
from ..schemas import TaskType, EligibilityMapping
from ..crud import TaskTypeCRUD, EligibilityMappingCRUD

router = APIRouter(prefix="/task-types", tags=["task-types"])


@router.get("", response_model=List[TaskType])
async def list_task_types(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all task types."""
    task_types = await TaskTypeCRUD.get_all(db)
    return task_types


router_eligibility = APIRouter(prefix="/eligibility-mappings", tags=["eligibility"])


@router_eligibility.get("", response_model=List[EligibilityMapping])
async def list_eligibility_mappings(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all eligibility mappings."""
    mappings = await EligibilityMappingCRUD.get_all(db)
    return mappings