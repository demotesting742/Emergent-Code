// ─── In-memory mock store with mutation support ───
// Single config toggle switches mock ↔ live; UI code never changes.

import type {
  User,
  UserType,
  TaskType,
  EligibilityMapping,
  Event,
  EventMember,
  WorkflowTemplate,
  WorkflowInstance,
  Task,
  AppConfig,
} from "./types"

import * as seed from "./seed"

// Deep-clone seed so mutations don't pollute originals
function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

class MockStore {
  users: User[] = clone(seed.users)
  userTypes: UserType[] = clone(seed.userTypes)
  taskTypes: TaskType[] = clone(seed.taskTypes)
  eligibilityMappings: EligibilityMapping[] = clone(seed.eligibilityMappings)
  events: Event[] = clone(seed.events)
  eventMembers: EventMember[] = clone(seed.eventMembers)
  workflowTemplates: WorkflowTemplate[] = clone(seed.workflowTemplates)
  workflowInstances: WorkflowInstance[] = clone(seed.workflowInstances)
  tasks: Task[] = clone(seed.tasks)

  config: AppConfig = {
    dataMode: "mock",
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003/api",
  }

  // Current persona (mock switcher)
  currentUserId: string = "u_admin"

  reset() {
    this.users = clone(seed.users)
    this.userTypes = clone(seed.userTypes)
    this.taskTypes = clone(seed.taskTypes)
    this.eligibilityMappings = clone(seed.eligibilityMappings)
    this.events = clone(seed.events)
    this.eventMembers = clone(seed.eventMembers)
    this.workflowTemplates = clone(seed.workflowTemplates)
    this.workflowInstances = clone(seed.workflowInstances)
    this.tasks = clone(seed.tasks)
    this.currentUserId = "u_admin"
  }

  // ─── Helpers ───

  getCurrentUser(): User {
    return this.users.find((u) => u.id === this.currentUserId)!
  }

  getUserType(usertypeId: string): UserType | undefined {
    return this.userTypes.find((ut) => ut.id === usertypeId)
  }

  getCurrentUserType(): UserType {
    const user = this.getCurrentUser()
    return this.getUserType(user.usertype_id)!
  }

  isAdmin(): boolean {
    return this.getCurrentUserType().access_level === "admin"
  }

  isCustomer(): boolean {
    return this.getCurrentUserType().name === "Customer"
  }

  // ─── Canonical Formulas (PRD verbatim) ───

  hasScope(taskEventId: string): boolean {
    if (this.isAdmin()) return true
    return this.eventMembers.some(
      (em) => em.user_id === this.currentUserId && em.event_id === taskEventId
    )
  }

  userTypeAllowsTaskType(usertypeId: string, tasktypeId: string): boolean {
    return this.eligibilityMappings.some(
      (em) => em.usertype_id === usertypeId && em.tasktype_id === tasktypeId
    )
  }

  parentsDone(task: Task): boolean {
    if (task.parent_ids.length === 0) return true
    return task.parent_ids.every((pid) => {
      const parent = this.tasks.find((t) => t.id === pid)
      return parent?.state === "DONE"
    })
  }

  visibleInTodo(task: Task): boolean {
    const userType = this.getCurrentUserType()
    return (
      this.hasScope(task.event_id) &&
      this.userTypeAllowsTaskType(userType.id, task.tasktype_id) &&
      this.parentsDone(task) &&
      task.assignee_id === null &&
      task.state === "TODO"
    )
  }

  canTake(task: Task): boolean {
    const userType = this.getCurrentUserType()
    return this.visibleInTodo(task) && userType.permissions.take
  }

  // ─── DAG Reevaluation (PRD: only on DONE) ───

  reevaluateChildren(taskId: string): void {
    const task = this.tasks.find((t) => t.id === taskId)
    if (!task || task.state !== "DONE") return

    for (const childId of task.child_ids) {
      const child = this.tasks.find((t) => t.id === childId)
      if (!child || child.state !== "LOCKED") continue
      if (this.parentsDone(child)) {
        child.state = "TODO"
      }
    }
  }

  // ─── Progress (PRD formula) ───

  getWorkflowProgress(workflowInstanceId: string): number {
    const instanceTasks = this.tasks.filter(
      (t) => t.workflow_instance_id === workflowInstanceId
    )
    if (instanceTasks.length === 0) return 0
    const done = instanceTasks.filter((t) => t.state === "DONE").length
    return Math.round((done / instanceTasks.length) * 100)
  }
}

// Singleton
export const store = new MockStore()
