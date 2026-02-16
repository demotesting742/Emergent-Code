#!/usr/bin/env python3
"""
Seed script to populate database with test data.

This script creates:
- Sample user types (Admin, Manager, Vendor, Customer, Coordinator)
- Sample users
- Sample events
- Sample task types
- Eligibility mappings
- Sample workflow templates
"""

import asyncio
import sys
from pathlib import Path
from uuid import uuid4

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import AsyncSessionLocal
from backend.models import (
    Profile,
    UserType,
    Event,
    EventMember,
    TaskType,
    EligibilityMapping,
    WorkflowTemplate,
)


async def seed_database():
    """Seed the database with test data."""
    async with AsyncSessionLocal() as db:
        try:
            print("Starting database seeding...")
            
            # Create User Types
            print("\n1. Creating user types...")
            user_types = {
                "SystemAdmin": UserType(id=uuid4(), name="SystemAdmin"),
                "EventManager": UserType(id=uuid4(), name="EventManager"),
                "Vendor": UserType(id=uuid4(), name="Vendor"),
                "Customer": UserType(id=uuid4(), name="Customer"),
                "Coordinator": UserType(id=uuid4(), name="Coordinator"),
            }
            
            for name, ut in user_types.items():
                db.add(ut)
                print(f"  - Created {name}")
            
            await db.commit()
            
            # Create Users
            print("\n2. Creating users...")
            users = {
                "admin": Profile(
                    id=uuid4(),
                    email="admin@eventflow.com",
                    display_name="System Admin"
                ),
                "manager1": Profile(
                    id=uuid4(),
                    email="manager1@eventflow.com",
                    display_name="Event Manager 1"
                ),
                "vendor1": Profile(
                    id=uuid4(),
                    email="vendor1@eventflow.com",
                    display_name="Vendor 1"
                ),
                "customer1": Profile(
                    id=uuid4(),
                    email="customer1@eventflow.com",
                    display_name="Customer 1"
                ),
                "coordinator1": Profile(
                    id=uuid4(),
                    email="coordinator1@eventflow.com",
                    display_name="Coordinator 1"
                ),
            }
            
            for key, user in users.items():
                db.add(user)
                print(f"  - Created {user.email}")
            
            await db.commit()
            
            # Create Events
            print("\n3. Creating events...")
            events = [
                Event(
                    id=uuid4(),
                    name="Annual Tech Conference 2025",
                    created_by=users["admin"].id
                ),
                Event(
                    id=uuid4(),
                    name="Product Launch Event",
                    created_by=users["manager1"].id
                ),
            ]
            
            for event in events:
                db.add(event)
                print(f"  - Created event: {event.name}")
            
            await db.commit()
            
            # Add event members
            print("\n4. Adding event members...")
            event_members = [
                EventMember(
                    event_id=events[0].id,
                    profile_id=users["manager1"].id,
                    role="manager"
                ),
                EventMember(
                    event_id=events[0].id,
                    profile_id=users["vendor1"].id,
                    role="vendor"
                ),
                EventMember(
                    event_id=events[0].id,
                    profile_id=users["customer1"].id,
                    role="customer"
                ),
                EventMember(
                    event_id=events[1].id,
                    profile_id=users["coordinator1"].id,
                    role="coordinator"
                ),
            ]
            
            for member in event_members:
                db.add(member)
            
            print(f"  - Added {len(event_members)} event memberships")
            await db.commit()
            
            # Create Task Types
            print("\n5. Creating task types...")
            task_types = [
                TaskType(id=uuid4(), slug="venue-booking", name="Venue Booking"),
                TaskType(id=uuid4(), slug="catering", name="Catering"),
                TaskType(id=uuid4(), slug="av-setup", name="AV Setup"),
                TaskType(id=uuid4(), slug="coordination", name="Coordination"),
                TaskType(id=uuid4(), slug="inspection", name="Inspection"),
            ]
            
            for tt in task_types:
                db.add(tt)
                print(f"  - Created task type: {tt.name}")
            
            await db.commit()
            
            # Create Eligibility Mappings
            print("\n6. Creating eligibility mappings...")
            mappings = [
                # EventManager can do venue booking and inspection
                EligibilityMapping(
                    user_type_id=user_types["EventManager"].id,
                    task_type_id=task_types[0].id
                ),
                EligibilityMapping(
                    user_type_id=user_types["EventManager"].id,
                    task_type_id=task_types[4].id
                ),
                # Vendor can do catering and AV
                EligibilityMapping(
                    user_type_id=user_types["Vendor"].id,
                    task_type_id=task_types[1].id
                ),
                EligibilityMapping(
                    user_type_id=user_types["Vendor"].id,
                    task_type_id=task_types[2].id
                ),
                # Coordinator can do coordination tasks
                EligibilityMapping(
                    user_type_id=user_types["Coordinator"].id,
                    task_type_id=task_types[3].id
                ),
            ]
            
            for mapping in mappings:
                db.add(mapping)
            
            print(f"  - Created {len(mappings)} eligibility mappings")
            await db.commit()
            
            # Create Workflow Template
            print("\n7. Creating workflow template...")
            template = WorkflowTemplate(
                id=uuid4(),
                name="Standard Event Setup Workflow",
                created_by=users["admin"].id
            )
            db.add(template)
            await db.commit()
            print(f"  - Created workflow template: {template.name}")
            
            print("\n✅ Database seeding completed successfully!")
            print("\nCreated:")
            print(f"  - {len(user_types)} user types")
            print(f"  - {len(users)} users")
            print(f"  - {len(events)} events")
            print(f"  - {len(event_members)} event memberships")
            print(f"  - {len(task_types)} task types")
            print(f"  - {len(mappings)} eligibility mappings")
            print(f"  - 1 workflow template")
            
            print("\nSample Users:")
            for key, user in users.items():
                print(f"  - {user.email} (ID: {user.id})")
            
        except Exception as e:
            print(f"\n❌ Error seeding database: {e}")
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(seed_database())