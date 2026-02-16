-- Step 1: Extensions, ENUM types, core tables, indexes

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1.1 ENUM types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_state') THEN
    CREATE TYPE task_state AS ENUM ('TODO','IN_PROGRESS','BLOCKED','DONE','CANCELLED');
  END IF;
END$$;

-- 1.2 Core tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.task_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eligibility_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type_id uuid REFERENCES public.task_types(id) ON DELETE CASCADE,
  user_type_id uuid REFERENCES public.user_types(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (task_type_id, user_type_id)
);

CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id uuid REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  tasktype_id uuid REFERENCES public.task_types(id),
  created_by uuid REFERENCES public.profiles(id),
  assignee_profile_id uuid REFERENCES public.profiles(id),
  state task_state DEFAULT 'TODO',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (task_id, depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS public.task_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  from_state task_state,
  to_state task_state,
  performed_by uuid REFERENCES public.profiles(id),
  performed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_assignments_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  old_assignee uuid REFERENCES public.profiles(id),
  new_assignee uuid REFERENCES public.profiles(id),
  changed_by uuid REFERENCES public.profiles(id),
  changed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.indexes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.schema_audit_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_name text NOT NULL,
  issue text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.openapi_db_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  openapi_path text NOT NULL,
  db_table text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 1.3 Indexes (examples)
CREATE INDEX IF NOT EXISTS idx_tasks_event_state ON public.tasks(event_id, state);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tasktype ON public.tasks(tasktype_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at);

-- Step 2: Helper functions and revoke EXECUTE

-- 2.1 get_my_profile_id: returns profile id for current auth.uid()
CREATE OR REPLACE FUNCTION public.get_my_profile_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT id FROM public.profiles WHERE id = (SELECT auth.uid());
$$;

-- 2.2 is_current_user_admin: checks admin role via profiles/user_types or claim
CREATE OR REPLACE FUNCTION public.is_current_user_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
  -- Example: check a special user_type association or a claim
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_types ut ON ut.id = (SELECT id FROM public.user_types WHERE name='admin' LIMIT 1)
    WHERE p.id = (SELECT auth.uid())
  );
$$;

-- 2.3 is_member_of_event(event_id)
CREATE OR REPLACE FUNCTION public.is_member_of_event(p_event_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_members em WHERE em.event_id = p_event_id AND em.profile_id = (SELECT auth.uid())
  );
$$;

-- 2.4 get_current_usertype_id
CREATE OR REPLACE FUNCTION public.get_current_usertype_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  -- Implementation depending on your schema linking profiles -> user_types
  SELECT ut.id FROM public.user_types ut
  JOIN public.profiles p ON p.id = (SELECT auth.uid())
  WHERE ut.name = 'default' LIMIT 1; -- adjust as needed
$$;

-- 2.5 is_current_user_customer
CREATE OR REPLACE FUNCTION public.is_current_user_customer() RETURNS boolean LANGUAGE sql STABLE AS $$
  -- Example: check user type or profile flag
  SELECT EXISTS (
    SELECT 1 FROM public.user_types ut
    JOIN public.profiles p ON p.id = (SELECT auth.uid())
    WHERE ut.id = (SELECT ut2.id FROM public.user_types ut2 WHERE ut2.name='customer' LIMIT 1)
  );
$$;

-- 2.6 current_usertype_allows_tasktype(tasktype_id)
CREATE OR REPLACE FUNCTION public.current_usertype_allows_tasktype(p_tasktype_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.eligibility_mappings em
    WHERE em.task_type_id = p_tasktype_id
      AND em.user_type_id = (SELECT public.get_current_usertype_id())
  );
$$;

-- 2.7 Revoke execute where specified (example)
REVOKE EXECUTE ON FUNCTION public.get_my_profile_id() FROM public;
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM public;
REVOKE EXECUTE ON FUNCTION public.is_member_of_event(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_current_usertype_id() FROM public;
REVOKE EXECUTE ON FUNCTION public.is_current_user_customer() FROM public;
REVOKE EXECUTE ON FUNCTION public.current_usertype_allows_tasktype(uuid) FROM public;


-- Step 3: Trigger functions and triggers (drop then create; improved cycle detection)

-- 3.1 tasks_updated_at_trigger_fn: keep updated_at current
CREATE OR REPLACE FUNCTION public.tasks_updated_at_trigger_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_updated_at_trigger ON public.tasks;
CREATE TRIGGER tasks_updated_at_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_updated_at_trigger_fn();

-- 3.2 prevent_task_dependency_cycle: avoid cycles when inserting dependencies
-- Use a recursive CTE to detect if NEW.task_id is reachable from NEW.depends_on_task_id
CREATE OR REPLACE FUNCTION public.prevent_task_dependency_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  found boolean := false;
BEGIN
  IF NEW.task_id = NEW.depends_on_task_id THEN
    RAISE EXCEPTION 'Task cannot depend on itself';
  END IF;

  WITH RECURSIVE reach(id) AS (
    SELECT NEW.depends_on_task_id
    UNION
    SELECT td.depends_on_task_id
    FROM public.task_dependencies td
    JOIN reach r ON td.task_id = r.id
  )
  SELECT EXISTS (SELECT 1 FROM reach WHERE id = NEW.task_id) INTO found;

  IF found THEN
    RAISE EXCEPTION 'Dependency cycle detected';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_task_dependency_cycle ON public.task_dependencies;
CREATE TRIGGER prevent_task_dependency_cycle
  BEFORE INSERT ON public.task_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.prevent_task_dependency_cycle();

-- 3.3 soft_delete_task: mark deleted_at instead of hard delete
CREATE OR REPLACE FUNCTION public.soft_delete_task() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.tasks SET deleted_at = now() WHERE id = OLD.id;
    RETURN NULL; -- suppress actual delete
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tasks_soft_delete ON public.tasks;
CREATE TRIGGER tasks_soft_delete BEFORE DELETE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.soft_delete_task();

-- 3.4 evaluate_and_unlock_children: when dependency resolved, unlock children
CREATE OR REPLACE FUNCTION public.evaluate_and_unlock_children() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Example: when a task transitions to DONE, evaluate dependent tasks and update state
  IF (TG_OP = 'UPDATE' AND NEW.state = 'DONE' AND OLD.state IS DISTINCT FROM 'DONE') THEN
    UPDATE public.tasks t SET state = 'TODO'
    WHERE t.id IN (
      SELECT td.task_id FROM public.task_dependencies td
      WHERE td.depends_on_task_id = NEW.id
      AND NOT EXISTS (
        SELECT 1 FROM public.task_dependencies td2
        JOIN public.tasks tt ON tt.id = td2.depends_on_task_id
        WHERE td2.task_id = td.task_id AND tt.state IS DISTINCT FROM 'DONE'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evaluate_and_unlock_children ON public.tasks;
CREATE TRIGGER evaluate_and_unlock_children AFTER UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.evaluate_and_unlock_children();

-- 3.5 task_state_transition_trigger + transition_task function
CREATE OR REPLACE FUNCTION public.transition_task(p_task_id uuid, p_to_state task_state) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tasks SET state = p_to_state, updated_at = now() WHERE id = p_task_id;
  INSERT INTO public.task_transitions (task_id, from_state, to_state, performed_at)
    SELECT id, state, p_to_state, now() FROM public.tasks WHERE id = p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tasks_state_change_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Example guard: prevent customers from moving tasks to DONE directly
  IF (TG_OP = 'UPDATE' AND NEW.state = 'DONE' AND public.is_current_user_customer()) THEN
    RAISE EXCEPTION 'Customers cannot mark tasks as DONE';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_state_change_guard ON public.tasks;
CREATE TRIGGER tasks_state_change_guard BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tasks_state_change_guard();


-- Step 4: Hard-delete prevention, workflow instantiation, admin functions

-- 4.1 hard-delete prevention: ensure deletes are soft by raising or moving to deleted_at
CREATE OR REPLACE FUNCTION public.prevent_hard_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Hard delete prevented; set deleted_at instead';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_tasks_hard_delete ON public.tasks;
CREATE TRIGGER prevent_tasks_hard_delete BEFORE DELETE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.prevent_hard_delete();

-- 4.2 instantiate_workflow: create workflow instance and tasks from a template
CREATE OR REPLACE FUNCTION public.instantiate_workflow(p_workflow_template_id uuid, p_event_id uuid, p_created_by uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  new_instance uuid;
BEGIN
  INSERT INTO public.workflow_instances (workflow_template_id, event_id, created_by)
  VALUES (p_workflow_template_id, p_event_id, COALESCE(p_created_by, (SELECT auth.uid()))) RETURNING id INTO new_instance;

  -- Example: assume workflow template has a table of template steps (workflow_template_steps)
  INSERT INTO public.tasks (workflow_instance_id, event_id, tasktype_id, created_by, state, created_at)
  SELECT new_instance, p_event_id, wts.task_type_id, COALESCE(p_created_by, (SELECT auth.uid())), 'TODO', now()
  FROM public.workflow_template_steps wts WHERE wts.workflow_template_id = p_workflow_template_id;

  RETURN new_instance;
END;
$$;

-- 4.3 admin_assign_task: allow admin to force-assign a task
CREATE OR REPLACE FUNCTION public.admin_assign_task(p_task_id uuid, p_assignee_profile_id uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admin may call admin_assign_task';
  END IF;

  UPDATE public.tasks SET assignee_profile_id = p_assignee_profile_id, updated_at = now() WHERE id = p_task_id;
  INSERT INTO public.task_assignments_audit (task_id, old_assignee, new_assignee, changed_by, changed_at)
    SELECT id, coalesce(assignee_profile_id, NULL), p_assignee_profile_id, (SELECT auth.uid()), now() FROM public.tasks WHERE id = p_task_id;
END;
$$;

-- 4.4 other administrative functions (examples)
CREATE OR REPLACE FUNCTION public.bulk_close_workflow(p_workflow_instance_id uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admin may bulk close';
  END IF;
  UPDATE public.tasks SET state='CANCELLED', updated_at = now() WHERE workflow_instance_id = p_workflow_instance_id;
END;
$$;

-- 4.5 Revoke execute where specified
REVOKE EXECUTE ON FUNCTION public.instantiate_workflow(uuid, uuid, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.admin_assign_task(uuid, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.bulk_close_workflow(uuid) FROM public;


-- Step 5: RLS enablement, policies, guard_event_member_removal

-- 5.1 Enable RLS on tables that need it
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
-- ... enable RLS on other user-facing tables as required


DROP POLICY IF EXISTS "tasks_admin_all" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_scoped" ON public.tasks;
DROP POLICY IF EXISTS "user_insert_by_owner" ON public.tasks;
DROP POLICY IF EXISTS "user_update_by_owner" ON public.tasks;
DROP POLICY IF EXISTS "user_delete_by_owner" ON public.tasks;

-- 5.2 Example policies for public.tasks (split per operation)
-- SELECT
CREATE POLICY "tasks_admin_all" ON public.tasks FOR ALL TO public USING (public.is_current_user_admin());

CREATE POLICY "tasks_select_scoped" ON public.tasks FOR SELECT TO public USING (
  public.is_current_user_admin()
  OR (
    public.is_member_of_event(event_id)
    AND NOT (public.is_current_user_customer() AND state = 'TODO')
  )
);

-- INSERT (WITH CHECK only)
CREATE POLICY "user_insert_by_owner" ON public.tasks FOR INSERT TO authenticated WITH CHECK (
  (SELECT auth.uid()) = created_by
  AND public.current_usertype_allows_tasktype(tasktype_id)
);

-- UPDATE
CREATE POLICY "user_update_by_owner" ON public.tasks FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = created_by) WITH CHECK ((SELECT auth.uid()) = created_by);

-- DELETE
CREATE POLICY "user_delete_by_owner" ON public.tasks FOR DELETE TO authenticated USING ((SELECT auth.uid()) = created_by);

-- 5.3 guard_event_member_removal: prevent removing last admin or vital member
CREATE OR REPLACE FUNCTION public.guard_event_member_removal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Example: don't allow removing last admin of event
    IF OLD.role = 'admin' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.event_members em WHERE em.event_id = OLD.event_id AND em.id <> OLD.id AND em.role = 'admin'
      ) THEN
        RAISE EXCEPTION 'Cannot remove the last admin from event';
      END IF;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS guard_event_member_removal ON public.event_members;
CREATE TRIGGER guard_event_member_removal BEFORE DELETE ON public.event_members FOR EACH ROW EXECUTE FUNCTION public.guard_event_member_removal();

-- 5.4 Revoke execute on guard function if desired
REVOKE EXECUTE ON FUNCTION public.guard_event_member_removal() FROM public;