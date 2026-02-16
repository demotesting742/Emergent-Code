from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from ..core import get_db, get_current_user, CurrentUser
from ..schemas import (
    WorkflowTemplate,
    WorkflowInstance,
    WorkflowInstantiateRequest,
    WorkflowInstantiateResponse,
    ActionResult,
)
from ..crud import WorkflowCRUD
from ..services import WorkflowService
from ..core import workflow_templates_cache, cached

router = APIRouter(prefix="/workflow-templates", tags=["workflows"])


@router.get("", response_model=List[WorkflowTemplate])
@cached(workflow_templates_cache)
async def list_workflow_templates(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all workflow templates (cached)."""
    templates = await WorkflowCRUD.get_all_templates(db)
    
    # TODO: Transform to response schema
    return []


@router.post("", response_model=ActionResult)
async def save_workflow_template(
    template: WorkflowTemplate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Save a workflow template."""
    # Validate template
    valid, error = await WorkflowService.validate_workflow_template(
        db, template.nodes, template.edges
    )
    
    if not valid:
        return ActionResult(ok=False, error=error)
    
    # TODO: Save template
    
    return ActionResult(ok=True)


router_instances = APIRouter(prefix="/workflow-instances", tags=["workflows"])


@router_instances.get("", response_model=List[WorkflowInstance])
async def list_workflow_instances(
    eventId: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List workflow instances."""
    event_uuid = UUID(eventId) if eventId else None
    
    instances = await WorkflowCRUD.get_instances(db, event_uuid)
    
    # TODO: Transform to response schema
    return []


router_instantiate = APIRouter(prefix="/workflows", tags=["workflows"])


@router_instantiate.post("/instantiate", response_model=WorkflowInstantiateResponse)
async def instantiate_workflow(
    request: WorkflowInstantiateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Instantiate a workflow for an event."""
    workflow_uuid = UUID(request.workflowId)
    event_uuid = UUID(request.eventId)
    
    # TODO: Get template, validate, instantiate
    
    return WorkflowInstantiateResponse(ok=True, instanceId="placeholder")