// ─── Service Layer: fetch + OpenAPI adapters ───
// Services are role-neutral; hooks enforce RBAC.
// Mock mode: direct store access with simulated latency.
// Live mode: HTTP via same interfaces (swap import).

import { store } from "@/src/data/store"
import createClient from "openapi-fetch"
import type { paths, components } from "./api-types"
import { supabase } from "@/src/lib/supabase"


// export types for consumers
export type Task = components["schemas"]["Task"]
export type TaskState = components["schemas"]["TaskState"]
export type User = components["schemas"]["User"]
export type UserType = components["schemas"]["UserType"]
export type Event = components["schemas"]["Event"]
export type EventMember = components["schemas"]["EventMember"]
export type WorkflowTemplate = components["schemas"]["WorkflowTemplate"]
export type WorkflowInstance = components["schemas"]["WorkflowInstance"]
export type TaskType = components["schemas"]["TaskType"]
export type EligibilityMapping = components["schemas"]["EligibilityMapping"]
export type ActionResult = components["schemas"]["ActionResult"]

const DATA_MODE = process.env.NEXT_PUBLIC_DATA_MODE || "mock"
const API_BASE_URL =
  (typeof window === "undefined"
    ? process.env.INTERNAL_API_URL
    : process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8003/api"

const client = createClient<paths>({ baseUrl: API_BASE_URL })

// Middleware to inject Supabase JWT
client.use({
  onRequest: async (request) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      request.headers.set("Authorization", `Bearer ${session.access_token}`)
    }
    return request
  }
})




const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms))

// ─── Task Service ───

export async function fetchTasks(eventId?: string): Promise<Task[]> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.GET("/tasks", {
      params: { query: { eventId } },
    })
    if (error) throw new Error("Failed to fetch tasks")
    return data!
  }

  await delay()
  if (eventId) return store.tasks.filter((t) => t.event_id === eventId) as Task[]
  return [...store.tasks] as Task[]
}

export async function fetchTask(taskId: string): Promise<Task | null> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.GET("/tasks/{taskId}", {
      params: { path: { taskId } },
    })
    if (error) return null
    return data ?? null
  }

  await delay()
  return (store.tasks.find((t) => t.id === taskId) as Task) ?? null
}

export async function pickTask(taskId: string): Promise<ActionResult> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.POST("/tasks/{taskId}/pick", {
      params: { path: { taskId } },
    })
    if (error) return { ok: false, error: "Failed to pick task" }
    return data as any
  }

  await delay()
  const task = store.tasks.find((t) => t.id === taskId)
  if (!task) return { ok: false, error: "Task not found" }
  if (store.isCustomer()) return { ok: false, error: "Forbidden: Customer cannot pick tasks" }
  if (!store.canTake(task as any)) return { ok: false, error: "Cannot take this task" }

  task.assignee_id = store.currentUserId
  task.state = "ASSIGNED"
  return { ok: true }
}

export async function transitionTask(
  taskId: string,
  nextState: TaskState
): Promise<ActionResult> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.POST("/tasks/{taskId}/transition", {
      params: { path: { taskId } },
      body: { nextState },
    })
    if (error) return { ok: false, error: "Failed to transition task" }
    return data as any
  }

  await delay()
  const task = store.tasks.find((t) => t.id === taskId)
  if (!task) return { ok: false, error: "Task not found" }
  if (store.isCustomer()) return { ok: false, error: "Forbidden: Customer cannot transition tasks" }

  const ut = store.getCurrentUserType()
  if (!ut.permissions.move_state) return { ok: false, error: "No move_state permission" }

  // Validate state machine
  const validNext = getValidTransition(task.state as TaskState)
  if (validNext !== nextState) {
    return { ok: false, error: `Invalid transition: ${task.state} -> ${nextState}` }
  }

  task.state = nextState
  // DAG reevaluation on DONE
  if (nextState === "DONE") {
    store.reevaluateChildren(taskId)
  }

  return { ok: true }
}

function getValidTransition(state: TaskState): TaskState | null {
  const map: Record<TaskState, TaskState | null> = {
    LOCKED: "TODO",
    TODO: "ASSIGNED",
    ASSIGNED: "IN_PROGRESS",
    IN_PROGRESS: "DONE",
    DONE: null,
  }
  return map[state]
}

export async function assignTask(
  taskId: string,
  userId: string | null
): Promise<ActionResult> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.POST("/tasks/{taskId}/assign", {
      params: { path: { taskId } },
      body: { userId },
    })
    if (error) return { ok: false, error: "Failed to assign task" }
    return data as any
  }

  await delay()
  const task = store.tasks.find((t) => t.id === taskId)
  if (!task) return { ok: false, error: "Task not found" }

  if (userId === null) {
    // Unassign
    task.assignee_id = null
    if (task.state === "ASSIGNED") task.state = "TODO"
    return { ok: true }
  }

  const targetUser = store.users.find((u) => u.id === userId)
  if (!targetUser) return { ok: false, error: "User not found" }

  // Check eligibility
  if (!store.userTypeAllowsTaskType(targetUser.usertype_id, task.tasktype_id)) {
    return { ok: false, error: "Ineligible UserType for this TaskType" }
  }

  task.assignee_id = userId
  if (task.state === "TODO") task.state = "ASSIGNED"
  return { ok: true }
}

export async function createTask(
  event_id: string,
  task_type_id: string,
  label: string,
  description: string,
  workflow_instance_id?: string
): Promise<ActionResult & { taskId?: string }> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.POST("/tasks", {
      params: {
        query: {
          eventId: event_id,
          taskTypeId: task_type_id,
          workflowInstanceId: workflow_instance_id
        }
      },
      body: { label, description },
    })
    if (error) return { ok: false, error: "Failed to create task" }
    return { ok: true, taskId: (data as any).id }
  }

  await delay()
  const taskId = `t_${Date.now()}`
  const newTask: Task = {
    id: taskId,
    workflow_instance_id: workflow_instance_id || "",
    event_id: event_id,
    node_id: `manual_${Date.now()}`,
    tasktype_id: task_type_id,
    label,
    description,
    state: "TODO",
    assignee_id: null,
    parent_ids: [],
    child_ids: [],
  }
  store.tasks.push(newTask as any)
  return { ok: true, taskId }
}


// ─── Event Service ───

export async function fetchEvents(): Promise<Event[]> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.GET("/events")
    if (error) throw new Error("Failed to fetch events")
    return data!
  }

  await delay()
  if (store.isAdmin()) return [...store.events] as Event[]
  const memberEventIds = store.eventMembers
    .filter((em) => em.user_id === store.currentUserId)
    .map((em) => em.event_id)
  return store.events.filter((e) => memberEventIds.includes(e.id)) as Event[]
}

export async function createEvent(name: string): Promise<ActionResult & { eventId?: string }> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.POST("/events", {
      body: { name, description: "" },
    })
    if (error) return { ok: false, error: "Failed to create event" }
    return { ok: true, eventId: (data as any).id }
  }

  await delay()
  const eventId = `e_${Date.now()}`
  const newEvent: Event = {
    id: eventId,
    name,
    description: "",
    created_at: new Date().toISOString(),
  }
  store.events.push(newEvent as any)
  // Add as admin member in mock
  store.eventMembers.push({
    id: `em_${Date.now()}`,
    event_id: eventId,
    user_id: store.currentUserId,
    role: "ADMIN",
    created_at: new Date().toISOString(),
  } as any)

  return { ok: true, eventId }
}


export async function fetchEventMembers(eventId: string): Promise<(EventMember & { user: User })[]> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.GET("/events/{eventId}/members", {
      params: { path: { eventId } },
    })
    if (error) throw new Error("Failed to fetch event members")
    // The type from OpenAPI might need adjustment or casting if usage differs slightly
    // but here we defined it as intersection, so it should match
    return data as (EventMember & { user: User })[]
  }

  await delay()
  return store.eventMembers
    .filter((em) => em.event_id === eventId)
    .map((em) => ({
      ...em,
      user: store.users.find((u) => u.id === em.user_id)!,
    })) as (EventMember & { user: User })[]
}

// ─── User Service ───

export async function fetchUsers(): Promise<User[]> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.GET("/users")
    if (error) throw new Error("Failed to fetch users")
    return data!
  }

  await delay()
  return [...store.users] as User[]
}

export async function fetchUserTypes(): Promise<UserType[]> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.GET("/user-types")
    if (error) throw new Error("Failed to fetch user types")
    return data!
  }

  await delay()
  return [...store.userTypes] as UserType[]
}

// ─── Workflow Service ───

export async function fetchWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.GET("/workflow-templates")
    if (error) throw new Error("Failed to fetch workflow templates")
    return data!
  }

  await delay()
  return [...store.workflowTemplates] as WorkflowTemplate[]
}

export async function fetchWorkflowInstances(eventId?: string): Promise<WorkflowInstance[]> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.GET("/workflow-instances", {
      params: { query: { eventId } },
    })
    if (error) throw new Error("Failed to fetch workflow instances")
    return data!
  }

  await delay()
  if (eventId) return store.workflowInstances.filter((wi) => wi.event_id === eventId) as WorkflowInstance[]
  return [...store.workflowInstances] as WorkflowInstance[]
}

export async function saveWorkflowTemplate(
  template: WorkflowTemplate
): Promise<ActionResult> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.POST("/workflow-templates", {
      body: template,
    })
    if (error) return { ok: false, error: "Failed to save workflow template" }
    return data as any
  }

  await delay()
  // Validate: no cycles
  if (hasCycle(template)) return { ok: false, error: "Template contains cycles" }
  // Validate: all TaskType IDs exist
  for (const node of template.nodes) {
    if (!store.taskTypes.find((tt) => tt.id === node.task_type_id)) {
      return { ok: false, error: `TaskType ${node.task_type_id} not found` }
    }
  }
  // Validate: unique node IDs
  const nodeIds = template.nodes.map((n) => n.node_id)
  if (new Set(nodeIds).size !== nodeIds.length) {
    return { ok: false, error: "Duplicate node IDs" }
  }

  const existing = store.workflowTemplates.findIndex(
    (wt) => wt.workflow_id === template.workflow_id
  )
  if (existing >= 0) {
    store.workflowTemplates[existing] = template as any
  } else {
    store.workflowTemplates.push(template as any)
  }
  return { ok: true }
}

export async function instantiateWorkflow(
  workflowId: string,
  eventId: string
): Promise<{ ok: boolean; error?: string; instanceId?: string }> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.POST("/workflows/instantiate", {
      body: { workflowId, eventId },
    })
    if (error) return { ok: false, error: "Failed to instantiate workflow" }
    return data as any
  }

  await delay()
  const template = store.workflowTemplates.find((wt) => wt.workflow_id === workflowId)
  if (!template) return { ok: false, error: "Template not found" }

  const instanceId = `wi_${Date.now()}`
  const instance: WorkflowInstance = {
    id: instanceId,
    workflow_id: workflowId,
    event_id: eventId,
    created_at: new Date().toISOString(),
  }
  store.workflowInstances.push(instance as any)

  // Build parent/child maps from edges
  const parentMap: Record<string, string[]> = {}
  const childMap: Record<string, string[]> = {}
  for (const node of template.nodes) {
    parentMap[node.node_id] = []
    childMap[node.node_id] = []
  }
  for (const edge of template.edges) {
    parentMap[edge.to_node_id].push(edge.from_node_id)
    childMap[edge.from_node_id].push(edge.to_node_id)
  }

  // Create task ID map
  const taskIdMap: Record<string, string> = {}
  for (const node of template.nodes) {
    taskIdMap[node.node_id] = `t_${Date.now()}_${node.node_id}`
  }

  // Create tasks
  for (const node of template.nodes) {
    const parentNodeIds = parentMap[node.node_id]
    const childNodeIds = childMap[node.node_id]
    const hasParents = parentNodeIds.length > 0

    const task: Task = {
      id: taskIdMap[node.node_id],
      workflow_instance_id: instanceId,
      event_id: eventId,
      node_id: node.node_id,
      tasktype_id: node.task_type_id,
      label: node.label,
      description: node.metadata.description || "",
      state: hasParents ? "LOCKED" : "TODO",
      assignee_id: null,
      parent_ids: parentNodeIds.map((nid) => taskIdMap[nid]),
      child_ids: childNodeIds.map((nid) => taskIdMap[nid]),
    }
    store.tasks.push(task as any)
  }

  return { ok: true, instanceId }
}

// ─── TaskType & Eligibility Service ───

export async function fetchTaskTypes(): Promise<TaskType[]> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.GET("/task-types")
    if (error) throw new Error("Failed to fetch task types")
    return data!
  }

  await delay()
  return [...store.taskTypes] as TaskType[]
}

export async function fetchEligibilityMappings(): Promise<EligibilityMapping[]> {
  if (DATA_MODE === "live") {
    const { data, error } = await client.GET("/eligibility-mappings")
    if (error) throw new Error("Failed to fetch eligibility mappings")
    return data!
  }

  await delay()
  return [...store.eligibilityMappings] as EligibilityMapping[]
}

// ─── DAG Cycle Detection ───

function hasCycle(template: WorkflowTemplate): boolean {
  const adj: Record<string, string[]> = {}
  for (const node of template.nodes) adj[node.node_id] = []
  for (const edge of template.edges) {
    if (adj[edge.from_node_id]) adj[edge.from_node_id].push(edge.to_node_id)
  }

  const visited = new Set<string>()
  const stack = new Set<string>()

  function dfs(nodeId: string): boolean {
    visited.add(nodeId)
    stack.add(nodeId)
    for (const neighbor of adj[nodeId] || []) {
      if (stack.has(neighbor)) return true
      if (!visited.has(neighbor) && dfs(neighbor)) return true
    }
    stack.delete(nodeId)
    return false
  }

  for (const node of template.nodes) {
    if (!visited.has(node.node_id) && dfs(node.node_id)) return true
  }
  return false
}
