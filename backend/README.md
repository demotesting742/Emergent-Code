# EventFlow Backend API

Production-level FastAPI backend implementing the EventFlow task management system with strict OpenAPI adherence, Supabase authentication, and PostgreSQL persistence.

## Architecture

The backend follows **Single Responsibility Principle (SRP)** with clear layer separation:

```
/backend
├── core/              # Core infrastructure (config, database, auth, cache)
├── models/            # SQLAlchemy ORM models
├── schemas/           # Pydantic v2 request/response DTOs
├── crud/              # Database operations (no business logic)
├── services/          # Business logic + RBAC + DAG orchestration
├── routes/            # FastAPI endpoints (thin orchestration)
├── middleware/        # Custom middleware
└── migrations/        # Alembic database migrations
```

## Key Features

✅ **OpenAPI-First**: Verbatim implementation of provided OpenAPI spec  
✅ **Supabase Auth**: JWT validation with Supabase authentication  
✅ **PostgreSQL/Supabase**: Full PostgreSQL support with async SQLAlchemy  
✅ **RBAC**: Role-based access control with DB-backed permissions  
✅ **DAG Engine**: Workflow templates with cycle detection and dependency management  
✅ **Efficient Queries**: No N+1 queries, uses eager loading and preloading  
✅ **Global Caching**: TTL-based caching for reference data (TaskTypes, UserTypes, etc.)  
✅ **Error Mapping**: DB constraints mapped to proper OpenAPI error codes  
✅ **State Machine**: Strict task state transitions with audit trail  
✅ **Transactional**: Atomic multi-table writes  

## Setup

### 1. Install Dependencies

```bash
cd /app/backend
pip install -r requirements.txt
```

### 2. Configure Environment

Update `/app/backend/.env` with your Supabase database password:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.mrshdnfxhcqjcrxcnjzs.supabase.co:5432/postgres
```

### 3. Apply Database Schema

Option A: Apply the provided db.sql directly to Supabase:
```bash
python /app/scripts/apply_schema.py
```

Option B: Use Alembic migrations:
```bash
cd /app/backend
alembic upgrade head
```

### 4. Seed Test Data

```bash
python /app/scripts/seed_database.py
```

This creates:
- 5 user types (SystemAdmin, EventManager, Vendor, Customer, Coordinator)
- 5 sample users
- 2 events with memberships
- 5 task types
- Eligibility mappings
- 1 workflow template

### 5. Run the Server

```bash
cd /app/backend
sudo supervisorctl restart backend
```

Or for development:
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

## API Documentation

Once running, access:

- **Interactive Docs**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc
- **OpenAPI JSON**: http://localhost:8001/openapi.json

## API Endpoints

### Tasks
- `GET /api/tasks` - List tasks (filtered by event)
- `GET /api/tasks/{taskId}` - Get task by ID
- `POST /api/tasks/{taskId}/pick` - Pick (assign to self)
- `POST /api/tasks/{taskId}/transition` - Transition state
- `POST /api/tasks/{taskId}/assign` - Assign/unassign task

### Events
- `GET /api/events` - List events
- `GET /api/events/{eventId}/members` - List event members

### Users & Types
- `GET /api/users` - List users
- `GET /api/user-types` - List user types (cached)
- `GET /api/task-types` - List task types (cached)
- `GET /api/eligibility-mappings` - List eligibility mappings (cached)

### Workflows
- `GET /api/workflow-templates` - List templates (cached)
- `POST /api/workflow-templates` - Save template
- `GET /api/workflow-instances` - List instances
- `POST /api/workflows/instantiate` - Instantiate workflow

## Authentication

All endpoints require JWT authentication via Supabase:

```bash
Authorization: Bearer <supabase-jwt-token>
```

## Authorization Model

### Access Levels
- **Admin** (global): Full access to all resources
- **Regular** (scoped): Access limited to event memberships

### Permissions (per UserType)
- `view`: Can view tasks
- `take`: Can pick tasks
- `move_state`: Can transition task states
- `assign`: Can assign tasks to others

### Eligibility
Users can only interact with tasks where:
1. They have **scope** (admin or event member)
2. Their **UserType** is mapped to the task's **TaskType**
3. They have the required **permission**

### Customer Restrictions
- Read-only access
- Cannot see Todo tasks
- Cannot pick, assign, or transition tasks

## DAG Workflow Engine

### Template Validation
- Checks for cycles (rejects cyclic workflows)
- Validates all node IDs are unique
- Ensures all TaskType references exist
- Validates edge references

### Instance Creation
- Creates tasks for each node
- Sets up dependencies based on edges
- Orphan tasks (no parents) start as TODO
- Tasks with parents start as BLOCKED

### Dependency Unlocking
- When task transitions to DONE, children are evaluated
- If ALL parents DONE, child unlocks (BLOCKED → TODO)
- Evaluation is synchronous and idempotent

## State Machine

```
TODO → IN_PROGRESS → DONE
        ↓
     BLOCKED → IN_PROGRESS
```

- **DONE** is immutable (no transitions allowed)
- All transitions require reason/note (append-only)
- Audit trail maintained in `task_transitions`

## Caching Strategy

### Cached Resources (Global, Non-User-Specific)
- TaskTypes
- UserTypes  
- EligibilityMappings
- WorkflowTemplates

### Cache Configuration
- TTL: 3600 seconds (1 hour)
- Max Size: 1000 entries
- Implementation: `cachetools.TTLCache`

### Cache Invalidation
- Manual via `invalidate_cache(cache, key)`
- Automatic on TTL expiry
- Global clear via `invalidate_all_caches()`

## Error Handling

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request (business rule violation)
- `401`: Unauthorized (invalid/missing JWT)
- `403`: Forbidden (permission/scope violation)
- `404`: Not Found (resource doesn't exist or out of scope)
- `500`: Internal Server Error (unexpected failures)

### Error Response Format
```json
{
  "ok": false,
  "error": "Detailed error message"
}
```

## Database Invariants Enforced

1. **0..1 Assignee**: One assignee per task maximum
2. **Soft Delete**: Tasks marked with `deleted_at`, not hard deleted
3. **DAG Directed Edges**: Cycle prevention enforced
4. **Concurrency-Safe Unlock**: Parent completion triggers child evaluation
5. **State Transitions**: All transitions logged in audit table
6. **DONE Immutability**: No state changes after DONE
7. **Customer Restrictions**: Read-only, enforced at API layer

## Testing

### Run Tests
```bash
cd /app/backend
pytest tests/ -v
```

### Smoke Tests Included
1. **Auth Test**: Login → me cycle
2. **Scope Test**: Regular user denied for non-member event (403)
3. **N+1 Test**: List endpoints use bounded queries
4. **Cache Test**: Verify TTL and correctness

## Migrations

### Generate New Migration
```bash
cd /app/backend
alembic revision --autogenerate -m "description"
```

### Apply Migrations
```bash
alembic upgrade head
```

### Rollback
```bash
alembic downgrade -1
```

## Performance Optimizations

1. **Eager Loading**: Uses `selectinload()` to prevent N+1
2. **Bounded Queries**: List endpoints have fixed query count
3. **Connection Pooling**: Configured in async_engine
4. **Index Optimization**: Indexes on frequently queried columns
5. **Global Caching**: Reference data cached to reduce DB calls

## Monitoring & Logging

- Configured via `logging` module
- Log level: INFO (development) / WARNING (production)
- Format: `%(asctime)s - %(name)s - %(levelname)s - %(message)s`

## Security

- JWT validation via Supabase
- Role/scope checks at service layer
- SQL injection prevented via SQLAlchemy ORM
- CORS configured via settings
- Secrets loaded from environment variables

## Sample Users (After Seeding)

```
admin@eventflow.com        - SystemAdmin
manager1@eventflow.com     - EventManager  
vendor1@eventflow.com      - Vendor
customer1@eventflow.com    - Customer
coordinator1@eventflow.com - Coordinator
```

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
python -c "from backend.core.database import async_engine; import asyncio; asyncio.run(async_engine.connect())"
```

### Migration Issues
```bash
# Check current version
alembic current

# View migration history
alembic history
```

### Authentication Issues
- Verify JWT_SECRET in .env matches Supabase project
- Check token expiry
- Ensure user profile exists in database

## Production Deployment

1. Set `ENVIRONMENT=production` in .env
2. Use gunicorn/uvicorn with multiple workers
3. Configure proper DATABASE_URL
4. Set up monitoring (e.g., Sentry)
5. Enable HTTPS
6. Configure firewall rules

## License

See project root for license information.