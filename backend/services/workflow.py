from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Set, Optional, Tuple
from uuid import UUID
from ..crud import WorkflowCRUD, TaskCRUD, TaskTypeCRUD
from ..models import WorkflowTemplate, WorkflowInstance, Task, TaskState
from ..schemas.workflow import WorkflowNode, WorkflowEdge


class WorkflowService:
    """Business logic for workflow operations."""
    
    @staticmethod
    async def validate_workflow_template(
        db: AsyncSession,
        nodes: List[WorkflowNode],
        edges: List[WorkflowEdge]
    ) -> Tuple[bool, Optional[str]]:
        """Validate workflow template for cycles and references."""
        
        # Check for duplicate node_ids
        node_ids = [node.node_id for node in nodes]
        if len(node_ids) != len(set(node_ids)):
            return False, "Duplicate node_ids found"
        
        # Check all task_type_ids exist
        for node in nodes:
            task_type = await TaskTypeCRUD.get_by_id(db, UUID(node.task_type_id))
            if not task_type:
                return False, f"TaskType {node.task_type_id} not found"
        
        # Check for cycles
        if WorkflowService._has_cycle(node_ids, edges):
            return False, "Workflow contains cycles"
        
        # Check all edge references exist
        for edge in edges:
            if edge.from_node_id not in node_ids or edge.to_node_id not in node_ids:
                return False, "Edge references non-existent node"
        
        return True, None
    
    @staticmethod
    def _has_cycle(node_ids: List[str], edges: List[WorkflowEdge]) -> bool:
        """Check if workflow DAG has cycles using DFS."""
        # Build adjacency list
        graph: Dict[str, List[str]] = {node_id: [] for node_id in node_ids}
        for edge in edges:
            graph[edge.from_node_id].append(edge.to_node_id)
        
        # DFS cycle detection
        visited: Set[str] = set()
        rec_stack: Set[str] = set()
        
        def has_cycle_util(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in graph[node]:
                if neighbor not in visited:
                    if has_cycle_util(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            
            rec_stack.remove(node)
            return False
        
        for node in node_ids:
            if node not in visited:
                if has_cycle_util(node):
                    return True
        
        return False
    
    @staticmethod
    async def instantiate_workflow(
        db: AsyncSession,
        workflow_id: UUID,
        event_id: UUID,
        nodes: List[WorkflowNode],
        edges: List[WorkflowEdge],
        created_by: UUID
    ) -> Tuple[bool, Optional[str], Optional[UUID]]:
        """Instantiate workflow for an event."""
        
        # Create workflow instance
        instance = await WorkflowCRUD.create_instance(
            db, workflow_id, event_id, created_by
        )
        
        # Build parent map
        parent_map: Dict[str, List[str]] = {node.node_id: [] for node in nodes}
        for edge in edges:
            parent_map[edge.to_node_id].append(edge.from_node_id)
        
        # Create tasks
        task_map: Dict[str, UUID] = {}
        for node in nodes:
            # Determine initial state
            initial_state = TaskState.TODO if not parent_map[node.node_id] else TaskState.BLOCKED
            
            task = await TaskCRUD.create(
                db,
                workflow_instance_id=instance.id,
                event_id=event_id,
                tasktype_id=UUID(node.task_type_id),
                created_by=created_by,
                state=initial_state,
            )
            task_map[node.node_id] = task.id
        
        # Create dependencies
        for edge in edges:
            parent_task_id = task_map[edge.from_node_id]
            child_task_id = task_map[edge.to_node_id]
            await TaskCRUD.create_dependency(db, child_task_id, parent_task_id)
        
        return True, None, instance.id