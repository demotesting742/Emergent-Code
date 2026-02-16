"use client"

import { useCallback } from "react"
import { useAuthContext, useStoreVersion, emitChange } from "@/src/hooks/auth-context"
import { store } from "@/src/data/store"
import * as api from "@/src/services/api"
import type { TaskState, WorkflowTemplate } from "@/src/data/types"

// ─── Re-export auth hook (delegates to context) ───

export function useAuth() {
  const ctx = useAuthContext()
  useStoreVersion()
  return ctx
}

// ─── Events Hook (scoped) ───

export function useEvents() {
  useStoreVersion()

  const { events } = (() => {
    if (store.isAdmin()) return { events: [...store.events] }
    const memberEventIds = store.eventMembers
      .filter((em) => em.user_id === store.currentUserId)
      .map((em) => em.event_id)
    return { events: store.events.filter((e) => memberEventIds.includes(e.id)) }
  })()

  const create = useCallback(async (name: string) => {
    const result = await api.createEvent(name)
    if (result.ok) emitChange()
    return result
  }, [])

  return { events, create }
}


// ─── Tasks Hook (RBAC enforced) ───

export function useTasks(eventId?: string | null) {
  useStoreVersion()

  // All tasks the current user can see (scope-filtered)
  const allTasks = store.tasks.filter((t) => {
    if (eventId && t.event_id !== eventId) return false
    return store.hasScope(t.event_id)
  })

  // Todo: visible_in_todo (Customer: always empty)
  const todoTasks = store.isCustomer()
    ? []
    : allTasks.filter((t) => store.visibleInTodo(t))

  // Kanban columns
  const assignedTasks = allTasks.filter((t) => t.state === "ASSIGNED")
  const inProgressTasks = allTasks.filter((t) => t.state === "IN_PROGRESS")
  const doneTasks = allTasks.filter((t) => t.state === "DONE")
  const lockedTasks = allTasks.filter((t) => t.state === "LOCKED")

  const pick = useCallback(async (taskId: string) => {
    if (store.isCustomer()) return { ok: false, error: "Forbidden" }
    const result = await api.pickTask(taskId)
    if (result.ok) emitChange()
    return result
  }, [])

  const transition = useCallback(
    async (taskId: string, nextState: TaskState) => {
      if (store.isCustomer()) return { ok: false, error: "Forbidden" }
      const result = await api.transitionTask(taskId, nextState)
      if (result.ok) emitChange()
      return result
    },
    []
  )

  const assign = useCallback(
    async (taskId: string, userId: string | null) => {
      const result = await api.assignTask(taskId, userId)
      if (result.ok) emitChange()
      return result
    },
    []
  )

  const create = useCallback(
    async (task_type_id: string, label: string, description: string, workflow_instance_id?: string) => {
      if (!eventId) return { ok: false, error: "Event ID required" }
      const result = await api.createTask(eventId, task_type_id, label, description, workflow_instance_id)
      if (result.ok) emitChange()
      return result
    },
    [eventId]
  )

  return {
    allTasks,
    todoTasks,
    assignedTasks,
    inProgressTasks,
    doneTasks,
    lockedTasks,
    pick,
    transition,
    assign,
    create,
  }
}


// ─── Workflow Hook ───

export function useWorkflows() {
  useStoreVersion()

  const templates = [...store.workflowTemplates]
  const instances = [...store.workflowInstances]

  const saveTemplate = useCallback(async (template: WorkflowTemplate) => {
    const result = await api.saveWorkflowTemplate(template)
    if (result.ok) emitChange()
    return result
  }, [])

  const instantiate = useCallback(
    async (workflowId: string, eventId: string) => {
      const result = await api.instantiateWorkflow(workflowId, eventId)
      if (result.ok) emitChange()
      return result
    },
    []
  )

  const getProgress = useCallback((instanceId: string) => {
    return store.getWorkflowProgress(instanceId)
  }, [])

  return { templates, instances, saveTemplate, instantiate, getProgress }
}

// ─── Config Hook ───

export function useConfig() {
  useStoreVersion()

  const config = { ...store.config }

  const setDataMode = useCallback((mode: "mock" | "live") => {
    store.config.dataMode = mode
    emitChange()
  }, [])

  return { config, setDataMode }
}

// ─── Reference Data ───

export function useReferenceData() {
  useStoreVersion()
  return {
    users: [...store.users],
    userTypes: [...store.userTypes],
    taskTypes: [...store.taskTypes],
    eligibilityMappings: [...store.eligibilityMappings],
    eventMembers: [...store.eventMembers],
  }
}
