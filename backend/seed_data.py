import asyncio
import os
import sys
import uuid
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
from sqlalchemy import select

async def seed():
    async with AsyncSessionLocal() as session:
        # 1. Get or create a Profile
        result = await session.execute(select(Profile))
        profile = result.scalars().first()
        
        if not profile:
            print("No profile found. Please log in first or create a dummy profile.")
            # For seeding purposes, let's create a dummy if none exists
            profile = Profile(
                id=uuid.uuid4(),
                email="admin@example.com",
                display_name="Admin User"
            )
            session.add(profile)
            await session.commit()
            print(f"Created dummy profile: {profile.id}")
        else:
            print(f"Using existing profile: {profile.id} ({profile.email})")

        # 2. Create User Types
        user_types = {
            "Admin": UserType(name="Admin"),
            "Manager": UserType(name="Manager"),
            "Worker": UserType(name="Worker")
        }
        for ut in user_types.values():
            # Check if exists
            res = await session.execute(select(UserType).where(UserType.name == ut.name))
            if not res.scalars().first():
                session.add(ut)
        await session.commit()
        print("User types seeded.")

        # 3. Create Task Types
        task_data = [
            {"slug": "setup", "name": "Initial Setup"},
            {"slug": "approval", "name": "Manager Approval"},
            {"slug": "execution", "name": "Task Execution"},
            {"slug": "review", "name": "Final Review"}
        ]
        task_types = {}
        for td in task_data:
            res = await session.execute(select(TaskType).where(TaskType.slug == td["slug"]))
            tt = res.scalars().first()
            if not tt:
                tt = TaskType(**td)
                session.add(tt)
            task_types[td["slug"]] = tt
        await session.commit()
        print("Task types seeded.")

        # 4. Eligibility Mappings
        # Everyone can do setup
        # Admin/Manager can do approval
        # Worker can do execution
        for tt_slug, ut_names in {
            "setup": ["Admin", "Manager", "Worker"],
            "approval": ["Admin", "Manager"],
            "execution": ["Worker", "Admin"],
            "review": ["Admin", "Manager"]
        }.items():
            tt = task_types[tt_slug]
            for ut_name in ut_names:
                ut = (await session.execute(select(UserType).where(UserType.name == ut_name))).scalars().first()
                # Check if exists
                res = await session.execute(select(EligibilityMapping).where(
                    EligibilityMapping.task_type_id == tt.id,
                    EligibilityMapping.user_type_id == ut.id
                ))
                if not res.scalars().first():
                    session.add(EligibilityMapping(task_type_id=tt.id, user_type_id=ut.id))
        await session.commit()
        print("Eligibility mappings seeded.")

        # 5. Create a Workflow Template
        res = await session.execute(select(WorkflowTemplate).where(WorkflowTemplate.name == "Standard Event Cleanup"))
        wt = res.scalars().first()
        if not wt:
            wt = WorkflowTemplate(name="Standard Event Cleanup", created_by=profile.id)
            session.add(wt)
            await session.commit()
        print(f"Workflow template seeded: {wt.id}")

        # 6. Create a Sample Event
        event_name = f"Spring Festival {datetime.now().year}"
        res = await session.execute(select(Event).where(Event.name == event_name))
        event = res.scalars().first()
        if not event:
            event = Event(name=event_name, created_by=profile.id)
            session.add(event)
            await session.commit()
            
            # Add member
            session.add(EventMember(event_id=event.id, profile_id=profile.id, role="ADMIN"))
            await session.commit()
        print(f"Event seeded: {event.id}")

        # 7. Instantiate Workflow (Create Tasks)
        res = await session.execute(select(WorkflowInstance).where(WorkflowInstance.event_id == event.id))
        wi = res.scalars().first()
        if not wi:
            wi = WorkflowInstance(
                workflow_template_id=wt.id,
                event_id=event.id,
                created_by=profile.id
            )
            session.add(wi)
            await session.commit()

            # Create Tasks
            # T1: Setup (TODO)
            # T2: Approval (BLOCKED by T1)
            # T3: Execution (BLOCKED by T2)
            # T4: Review (BLOCKED by T3)
            
            t1 = Task(
                workflow_instance_id=wi.id,
                event_id=event.id,
                tasktype_id=task_types["setup"].id,
                created_by=profile.id,
                state=TaskState.TODO
            )
            session.add(t1)
            await session.flush()

            t2 = Task(
                workflow_instance_id=wi.id,
                event_id=event.id,
                tasktype_id=task_types["approval"].id,
                created_by=profile.id,
                state=TaskState.BLOCKED
            )
            session.add(t2)
            await session.flush()

            t3 = Task(
                workflow_instance_id=wi.id,
                event_id=event.id,
                tasktype_id=task_types["execution"].id,
                created_by=profile.id,
                state=TaskState.BLOCKED
            )
            session.add(t3)
            await session.flush()

            # Dependencies
            session.add(TaskDependency(task_id=t2.id, depends_on_task_id=t1.id))
            session.add(TaskDependency(task_id=t3.id, depends_on_task_id=t2.id))
            
            await session.commit()
            print("Workflow instantiated with tasks.")

    print("Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
