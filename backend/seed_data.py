import asyncio
import os
import sys
import uuid
import json
from datetime import datetime

# Ensure backend package is in path
sys.path.append(os.getcwd())

from backend.core.database import AsyncSessionLocal, async_engine, Base
from backend.models import (
    UserType, TaskType, EligibilityMapping, 
    Event, EventMember, Profile, 
    WorkflowTemplate, WorkflowInstance, 
    Task, TaskState, TaskDependency
)
from sqlalchemy import select, text


# ─── Indian Marriage Workflow (33 tasks) ───

INDIAN_MARRIAGE_TASKS = [
    (1,  "Define budget + guest count",                                      []),
    (2,  "Fix dates (functions + wedding)",                                  [1]),
    (3,  "Book venue(s) (functions + wedding)",                              [2]),
    (4,  "Shortlist key vendors (caterer/decor/photo-video/makeup/DJ/pandit)",[1]),
    (5,  "Book caterer",                                                     [3, 4]),
    (6,  "Book photographer + videographer",                                 [2, 4]),
    (7,  "Book makeup + mehndi artists",                                     [2, 4]),
    (8,  "Book DJ/sangeet + sound",                                          [3, 4]),
    (9,  "Book pandit + set muhurat",                                        [2, 4]),
    (10, "Finalize theme + decor direction",                                 [3]),
    (11, "Finalize menu",                                                    [5]),
    (12, "Create invite list (family approved)",                             [1]),
    (13, "Design invites (digital/print)",                                   [12]),
    (14, "Send invites",                                                     [13]),
    (15, "Confirm key guests travel/stay",                                   [14]),
    (16, "Book hotel blocks (if needed)",                                    [15]),
    (17, "Outfit shopping (bride/groom/family)",                             [10]),
    (18, "Jewelry finalization",                                             [1]),
    (19, "Plan functions (Haldi/Mehndi/Sangeet)",                            [3]),
    (20, "Finalize decor per function",                                      [10, 19]),
    (21, "Final headcount lock",                                             [14]),
    (22, "Create master timeline + responsibilities",                        [3, 5, 6, 7, 8, 9]),
    (23, "Vendor coordination + advance payments",                           [22]),
    (24, "Seating plan + entry management",                                  [21]),
    (25, "Walkthrough + rehearsal / sound-check",                            [22, 20]),
    (26, "Execute Mehndi function",                                          [19, 7, 20]),
    (27, "Execute Haldi function",                                           [19, 20]),
    (28, "Execute Sangeet function",                                         [19, 8, 20]),
    (29, "Wedding setup day (decor/mandap/catering ops)",                    [20, 5]),
    (30, "Baraat + entry",                                                   [29]),
    (31, "Wedding rituals (varmala/phera etc.)",                             [30, 9]),
    (32, "Reception (if same/next)",                                         [31, 5, 8]),
    (33, "Vidaai",                                                           [31]),
]


# ─── Birthday Workflow (24 tasks) ───

BIRTHDAY_TASKS = [
    (1,  "Set budget + guest count",                    []),
    (2,  "Choose date/time + duration",                 [1]),
    (3,  "Select venue (home/hall/outdoor)",             [2]),
    (4,  "Choose theme",                                [3]),
    (5,  "Finalize guest list",                         [1]),
    (6,  "Create invitation (digital)",                 [5, 4]),
    (7,  "Send invites",                                [6]),
    (8,  "Plan food format (snacks/meal)",              [1]),
    (9,  "Book/arrange catering (if needed)",           [3, 8]),
    (10, "Arrange decorations",                         [4]),
    (11, "Arrange cake",                                [4]),
    (12, "Plan games/host/agenda",                      [2]),
    (13, "Arrange music/speaker",                       [12]),
    (14, "Arrange photobooth (backdrop/props/camera)",  [4]),
    (15, "Confirm RSVPs + headcount lock",              [7]),
    (16, "Procure return gifts",                        [15]),
    (17, "Setup (decor/food/photobooth)",               [10, 9, 14]),
    (18, "Welcome + guest check-in",                    [17]),
    (19, "Games/activities live",                       [18, 12]),
    (20, "Cake cutting",                                [18, 11]),
    (21, "Photobooth live",                             [17]),
    (22, "Food service",                                [17]),
    (23, "Return gifts distribution",                   [16, 18]),
    (24, "Wrap-up + cleanup",                           [23]),
]


def make_slug(prefix: str, num: int, label: str) -> str:
    """Create a URL-safe slug from prefix + label."""
    slug = label.lower()
    slug = slug.replace("/", "-").replace("(", "").replace(")", "")
    slug = slug.replace("+", "and").replace(" ", "-")
    slug = slug.replace("--", "-").strip("-")
    # Truncate for sanity
    slug = slug[:60]
    return f"{prefix}-{num:02d}-{slug}"


def build_workflow_data(prefix: str, tasks_def):
    """Build task_types list, nodes JSON, and edges JSON from a task definition."""
    task_types = []
    nodes = []
    edges = []
    
    for num, label, deps in tasks_def:
        slug = make_slug(prefix, num, label)
        task_types.append({"slug": slug, "name": label})
        
        nodes.append({
            "node_id": f"{prefix}_n{num}",
            "task_type_id": slug,  # Placeholder; real UUID filled in seed()
            "label": label,
        })
        
        for dep_num in deps:
            edges.append({
                "from_node_id": f"{prefix}_n{dep_num}",
                "to_node_id": f"{prefix}_n{num}",
            })
    
    return task_types, nodes, edges


async def seed():
    async with AsyncSessionLocal() as session:
        # ──────────────────────────────────────────────
        # 0. Add JSONB columns if missing (safe ALTER)
        # ──────────────────────────────────────────────
        try:
            await session.execute(text(
                "ALTER TABLE public.workflow_templates "
                "ADD COLUMN IF NOT EXISTS nodes_json jsonb DEFAULT '[]'"
            ))
            await session.execute(text(
                "ALTER TABLE public.workflow_templates "
                "ADD COLUMN IF NOT EXISTS edges_json jsonb DEFAULT '[]'"
            ))
            await session.commit()
            print("✓ Ensured nodes_json / edges_json columns exist")
        except Exception as e:
            await session.rollback()
            print(f"⚠ Column migration note: {e}")

        # ──────────────────────────────────────────────
        # 1. Get or create a Profile
        # ──────────────────────────────────────────────
        result = await session.execute(select(Profile))
        profile = result.scalars().first()
        
        if not profile:
            profile = Profile(
                id=uuid.uuid4(),
                email="admin@example.com",
                display_name="Admin User"
            )
            session.add(profile)
            await session.commit()
            print(f"✓ Created dummy profile: {profile.id}")
        else:
            print(f"✓ Using existing profile: {profile.id} ({profile.email})")

        # ──────────────────────────────────────────────
        # 2. Create User Types
        # ──────────────────────────────────────────────
        for ut_name in ["Admin", "Manager", "Worker"]:
            res = await session.execute(select(UserType).where(UserType.name == ut_name))
            if not res.scalars().first():
                session.add(UserType(name=ut_name))
        await session.commit()
        print("✓ User types seeded")

        # ──────────────────────────────────────────────
        # 3. Build workflow data
        # ──────────────────────────────────────────────
        im_task_types, im_nodes, im_edges = build_workflow_data("im", INDIAN_MARRIAGE_TASKS)
        bd_task_types, bd_nodes, bd_edges = build_workflow_data("bd", BIRTHDAY_TASKS)
        
        all_task_type_defs = im_task_types + bd_task_types

        # ──────────────────────────────────────────────
        # 4. Create Task Types (upsert by slug)
        # ──────────────────────────────────────────────
        slug_to_uuid = {}
        for td in all_task_type_defs:
            res = await session.execute(select(TaskType).where(TaskType.slug == td["slug"]))
            tt = res.scalars().first()
            if not tt:
                tt = TaskType(slug=td["slug"], name=td["name"])
                session.add(tt)
                await session.flush()
            slug_to_uuid[td["slug"]] = str(tt.id)
        await session.commit()
        print(f"✓ {len(all_task_type_defs)} task types seeded")

        # ──────────────────────────────────────────────
        # 5. Patch node task_type_id with real UUIDs
        # ──────────────────────────────────────────────
        for node in im_nodes:
            node["task_type_id"] = slug_to_uuid[node["task_type_id"]]
        for node in bd_nodes:
            node["task_type_id"] = slug_to_uuid[node["task_type_id"]]

        # ──────────────────────────────────────────────
        # 6. Create Workflow Templates (with nodes_json / edges_json)
        # ──────────────────────────────────────────────
        templates_to_create = [
            ("Indian Marriage", im_nodes, im_edges),
            ("Birthday",       bd_nodes, bd_edges),
        ]

        for name, nodes_data, edges_data in templates_to_create:
            res = await session.execute(select(WorkflowTemplate).where(WorkflowTemplate.name == name))
            wt = res.scalars().first()
            if wt:
                # Update existing template with latest nodes/edges
                wt.nodes_json = nodes_data
                wt.edges_json = edges_data
            else:
                wt = WorkflowTemplate(
                    name=name,
                    created_by=profile.id,
                    nodes_json=nodes_data,
                    edges_json=edges_data,
                )
                session.add(wt)
            await session.flush()
            print(f"✓ Workflow template '{name}' seeded: {wt.id}  ({len(nodes_data)} nodes, {len(edges_data)} edges)")
        
        await session.commit()

        # ──────────────────────────────────────────────
        # 7. Eligibility: All task types accessible by Admin+Manager+Worker
        # ──────────────────────────────────────────────
        ut_result = await session.execute(select(UserType))
        user_types_db = {ut.name: ut for ut in ut_result.scalars().all()}
        
        tt_result = await session.execute(select(TaskType))
        all_task_types_db = tt_result.scalars().all()
        
        for tt in all_task_types_db:
            for ut in user_types_db.values():
                res = await session.execute(select(EligibilityMapping).where(
                    EligibilityMapping.task_type_id == tt.id,
                    EligibilityMapping.user_type_id == ut.id
                ))
                if not res.scalars().first():
                    session.add(EligibilityMapping(task_type_id=tt.id, user_type_id=ut.id))
        await session.commit()
        print("✓ Eligibility mappings seeded (all roles for all task types)")

        # ──────────────────────────────────────────────
        # 8. Create sample events (one per workflow)
        # ──────────────────────────────────────────────
        sample_events = [
            ("Riya & Arjun Wedding", "Indian Marriage"),
            ("Aarav's 5th Birthday", "Birthday"),
        ]

        for event_name, wf_name in sample_events:
            # Get or create event
            res = await session.execute(select(Event).where(Event.name == event_name))
            event = res.scalars().first()
            if not event:
                event = Event(name=event_name, created_by=profile.id)
                session.add(event)
                await session.commit()
                # Add creator as member
                session.add(EventMember(event_id=event.id, profile_id=profile.id, role="ADMIN"))
                await session.commit()
                print(f"✓ Event '{event_name}' created: {event.id}")
            else:
                print(f"✓ Event '{event_name}' already exists: {event.id}")

            # Get workflow template
            res = await session.execute(select(WorkflowTemplate).where(WorkflowTemplate.name == wf_name))
            wt = res.scalars().first()
            if not wt:
                print(f"  ⚠ Workflow template '{wf_name}' not found, skipping instantiation")
                continue

            # Check if already instantiated
            res = await session.execute(select(WorkflowInstance).where(
                WorkflowInstance.event_id == event.id,
                WorkflowInstance.workflow_template_id == wt.id
            ))
            if res.scalars().first():
                print(f"  ✓ Workflow already instantiated for '{event_name}', skipping")
                continue

            # Create workflow instance
            wi = WorkflowInstance(
                workflow_template_id=wt.id,
                event_id=event.id,
                created_by=profile.id
            )
            session.add(wi)
            await session.flush()

            # Determine which data to use
            wf_nodes = wt.nodes_json
            wf_edges = wt.edges_json

            # Build parent map to determine initial state
            parent_map = {n["node_id"]: [] for n in wf_nodes}
            for edge in wf_edges:
                parent_map[edge["to_node_id"]].append(edge["from_node_id"])

            # Create tasks
            node_to_task = {}
            for node in wf_nodes:
                initial_state = TaskState.TODO if not parent_map[node["node_id"]] else TaskState.BLOCKED
                task = Task(
                    workflow_instance_id=wi.id,
                    event_id=event.id,
                    tasktype_id=uuid.UUID(node["task_type_id"]),
                    created_by=profile.id,
                    state=initial_state,
                )
                session.add(task)
                await session.flush()
                node_to_task[node["node_id"]] = task.id

            # Create dependencies
            for edge in wf_edges:
                session.add(TaskDependency(
                    task_id=node_to_task[edge["to_node_id"]],
                    depends_on_task_id=node_to_task[edge["from_node_id"]],
                ))
            
            await session.commit()
            task_count = len(wf_nodes)
            dep_count = len(wf_edges)
            print(f"  ✓ Workflow instantiated for '{event_name}': {task_count} tasks, {dep_count} dependencies")

    print("\n🎉 Seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
