from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from ..core import get_db, get_current_user, CurrentUser
from ..schemas import (
    WorkflowTemplate,
    WorkflowTemplateInput,
    WorkflowInstance,
    WorkflowInstantiateRequest,
    WorkflowInstantiateResponse,
    ActionResult,
)
from ..schemas.common import safe_uuid
from ..schemas.workflow import WorkflowNode, WorkflowEdge
from ..crud import WorkflowCRUD
from ..services import WorkflowService

router = APIRouter(prefix="/workflow-templates", tags=["workflows"])


@router.get("", response_model=List[WorkflowTemplate])
async def list_workflow_templates(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all workflow templates."""
    templates = await WorkflowCRUD.get_all_templates(db)
    return [WorkflowTemplate.from_orm_model(t) for t in templates]


@router.post("", response_model=ActionResult)
async def save_workflow_template(
    template: WorkflowTemplateInput,
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
    
    # Save template
    user_uuid = safe_uuid(current_user.user_id)
    if not user_uuid:
        raise HTTPException(status_code=400, detail=f"Invalid user ID: {current_user.user_id}")
    await WorkflowCRUD.create_template(db, template.name, user_uuid)
    
    return ActionResult(ok=True)


router_instances = APIRouter(prefix="/workflow-instances", tags=["workflows"])


@router_instances.get("", response_model=List[WorkflowInstance])
async def list_workflow_instances(
    eventId: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List workflow instances."""
    event_uuid = safe_uuid(eventId) if eventId else None
    if eventId and not event_uuid:
        raise HTTPException(status_code=400, detail=f"Invalid event ID: {eventId}")
    instances = await WorkflowCRUD.get_instances(db, event_uuid)
    return instances


router_instantiate = APIRouter(prefix="/workflows", tags=["workflows"])


@router_instantiate.post("/instantiate", response_model=WorkflowInstantiateResponse)
async def instantiate_workflow(
    request: WorkflowInstantiateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Instantiate a workflow for an event — creates tasks from nodes."""
    try:
        workflow_uuid = safe_uuid(request.workflowId)
        event_uuid = safe_uuid(request.eventId)
        user_uuid = safe_uuid(current_user.user_id)
        
        if not workflow_uuid:
            return WorkflowInstantiateResponse(ok=False, error=f"Invalid workflow ID: {request.workflowId}")
        if not event_uuid:
            return WorkflowInstantiateResponse(ok=False, error=f"Invalid event ID: {request.eventId}")
        if not user_uuid:
            return WorkflowInstantiateResponse(ok=False, error=f"Invalid user ID: {current_user.user_id}")
        
        # If nodes were provided, use them; otherwise read from template DB
        nodes = request.nodes
        edges = request.edges
        
        if not nodes:
            # Fall back to DB-stored nodes/edges
            template = await WorkflowCRUD.get_template_by_id(db, workflow_uuid)
            if template and template.nodes_json:
                nodes = [WorkflowNode(**n) for n in template.nodes_json]
                edges = [WorkflowEdge(**e) for e in (template.edges_json or [])]
            else:
                return WorkflowInstantiateResponse(
                    ok=False, 
                    error="No nodes provided and template has no stored workflow graph"
                )
        
        success, error, instance_id = await WorkflowService.instantiate_workflow(
            db, workflow_uuid, event_uuid, nodes, edges, user_uuid
        )
        
        if not success:
            return WorkflowInstantiateResponse(ok=False, error=error)
        
        return WorkflowInstantiateResponse(
            ok=True, 
            instanceId=str(instance_id)
        )
    except Exception as e:
        print(f"DEBUG: Failed to instantiate workflow: {str(e)}")
        return WorkflowInstantiateResponse(
            ok=False, 
            error=f"Failed to instantiate workflow: {str(e)}"
        )