from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
from ..crud import EventMemberCRUD, UserTypeCRUD, EligibilityMappingCRUD
from ..models import Task


class AuthorizationService:
    """Authorization and RBAC service."""
    
    @staticmethod
    async def is_admin(db: AsyncSession, user_id: UUID) -> bool:
        """Check if user is admin (placeholder - needs proper implementation)."""
        # TODO: Implement proper admin check via user type
        return False
    
    @staticmethod
    async def has_scope(db: AsyncSession, user_id: UUID, event_id: UUID) -> bool:
        """Check if user has scope (admin or event member)."""
        # Admin check
        if await AuthorizationService.is_admin(db, user_id):
            return True
        
        # Event membership check
        return await EventMemberCRUD.is_member(db, user_id, event_id)
    
    @staticmethod
    async def is_eligible(
        db: AsyncSession,
        user_id: UUID,
        usertype_id: UUID,
        tasktype_id: UUID
    ) -> bool:
        """Check if user type is eligible for task type."""
        return await EligibilityMappingCRUD.is_eligible(db, usertype_id, tasktype_id)
    
    @staticmethod
    async def can_view_task(
        db: AsyncSession,
        user_id: UUID,
        usertype_id: UUID,
        task: Task
    ) -> bool:
        """Check if user can view task."""
        # TODO: Add permission check
        return await AuthorizationService.has_scope(db, user_id, task.event_id)
    
    @staticmethod
    async def can_take_task(
        db: AsyncSession,
        user_id: UUID,
        usertype_id: UUID,
        task: Task
    ) -> bool:
        """Check if user can take (pick) task."""
        # has_scope AND eligible AND unassigned AND parents done
        if not await AuthorizationService.has_scope(db, user_id, task.event_id):
            return False
        
        if not await AuthorizationService.is_eligible(db, user_id, usertype_id, task.tasktype_id):
            return False
        
        # TODO: Add take permission check
        # TODO: Check parents done
        # TODO: Check unassigned
        
        return True
    
    @staticmethod
    async def can_assign_task(
        db: AsyncSession,
        user_id: UUID,
        usertype_id: UUID,
        task: Task
    ) -> bool:
        """Check if user can assign task."""
        # Admin or has assign permission
        if await AuthorizationService.is_admin(db, user_id):
            return True
        
        # TODO: Check assign permission from user type
        return False
    
    @staticmethod
    async def can_transition_task(
        db: AsyncSession,
        user_id: UUID,
        usertype_id: UUID,
        task: Task
    ) -> bool:
        """Check if user can transition task state."""
        # Must have scope
        if not await AuthorizationService.has_scope(db, user_id, task.event_id):
            return False
        
        # TODO: Check move_state permission
        # TODO: Check if assigned to user or admin
        
        return True