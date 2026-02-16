from fastapi import APIRouter
from .tasks import router as tasks_router
from .events import router as events_router
from .users import router as users_router
from .user_types import router as user_types_router
from .task_types import router as task_types_router, router_eligibility
from .workflows import (
    router as workflow_templates_router,
    router_instances as workflow_instances_router,
    router_instantiate as workflow_instantiate_router,
)

api_router = APIRouter(prefix="/api")

api_router.include_router(tasks_router)
api_router.include_router(events_router)
api_router.include_router(users_router)
api_router.include_router(user_types_router)
api_router.include_router(task_types_router)
api_router.include_router(router_eligibility)
api_router.include_router(workflow_templates_router)
api_router.include_router(workflow_instances_router)
api_router.include_router(workflow_instantiate_router)

__all__ = ["api_router"]