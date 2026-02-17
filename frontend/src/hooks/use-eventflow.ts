"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuthContext, useStoreVersion, emitChange } from "@/src/hooks/auth-context"
import { store } from "@/src/data/store"
import * as api from "@/src/services/api"
import type { TaskState, WorkflowTemplate, Event, Task, WorkflowInstance } from "@/src/data/types"

function isLive() {
  return store.config.dataMode === "live"
}

// ─── Re-export auth hook (delegates to context) ───

export function useAuth() {
  const ctx = useAuthContext()
  useStoreVersion()
  return ctx
}

// ─── Events Hook (scoped) ───

export function useEvents() {
  const storeVersion = useStoreVersion()
  const [liveEvents, setLiveEvents] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isLive()) return
    let cancelled = false
    api.fetchEvents()
      .then((data) => { if (!cancelled) { setLiveEvents(data); setLoaded(true) } })
      .catch((err) => { console.error("fetchEvents failed:", err); setLoaded(true) })
    return () => { cancelled = true }
  }, [storeVersion])

  const events = isLive()
    ? liveEvents
    : (() => {
        if (store.isAdmin()) return [...store.events]
        const memberEventIds = store.eventMembers
          .filter((em) => em.user_id === store.currentUserId)
          .map((em) => em.event_id)
        return store.events.filter((e) => memberEventIds.includes(e.id))
      })()

  const create = useCallback(async (name: string) => {
    const result = await api.createEvent(name)
    if (result.ok) {
      if (isLive()) {
        // Re-fetch events from API after creation
        api.fetchEvents()
          .then((data) => { setLiveEvents(data); emitChange() })
          .catch(() => {})
      }
      emitChange()
    }
    return result
  }, [])

  const update = useCallback(async (eventId: string, name: string) => {
    const result = await api.updateEvent(eventId, name)
    if (result.ok) {
      if (isLive()) {
        api.fetchEvents()
          .then((data) => { setLiveEvents(data); emitChange() })
          .catch(() => {})
      }
      emitChange()
    }
    return result
  }, [])

  const remove = useCallback(async (eventId: string) => {
    const result = await api.deleteEvent(eventId)
    if (result.ok) {
      if (isLive()) {
        api.fetchEvents()
          .then((data) => { setLiveEvents(data); emitChange() })
          .catch(() => {})
      }
      emitChange()
    }
    return result
  }, [])

  return { events, create, update, remove }
}


// ─── Tasks Hook (RBAC enforced) ───

export function useTasks(eventId?: string | null) {
  const storeVersion = useStoreVersion()
  const [liveTasks, setLiveTasks] = useState<any[]>([])

  useEffect(() => {
    if (!isLive()) return
    let cancelled = false
    api.fetchTasks(eventId || undefined)
      .then((data) => { if (!cancelled) setLiveTasks(data) })
      .catch((err) => console.error("fetchTasks failed:", err))
    return () => { cancelled = true }
  }, [eventId, storeVersion])

  // All tasks the current user can see
  const allTasks = isLive()
    ? (eventId ? liveTasks.filter((t: any) => t.event_id === eventId) : liveTasks)
    : store.tasks.filter((t) => {
        if (eventId && t.event_id !== eventId) return false
        return store.hasScope(t.event_id)
      })

  // Todo: visible_in_todo (Customer: always empty)
  const todoTasks = isLive()
    ? allTasks.filter((t: any) => t.state === "TODO")
    : store.isCustomer()
      ? []
      : allTasks.filter((t: any) => store.visibleInTodo(t as Task))

  // Kanban columns
  const assignedTasks = allTasks.filter((t: any) => t.state === "ASSIGNED")
  const inProgressTasks = allTasks.filter((t: any) => t.state === "IN_PROGRESS")
  const doneTasks = allTasks.filter((t: any) => t.state === "DONE")
  const lockedTasks = allTasks.filter((t: any) => t.state === "LOCKED")

  const pick = useCallback(async (taskId: string) => {
    if (!isLive() && store.isCustomer()) return { ok: false, error: "Forbidden" }
    const result = await api.pickTask(taskId)
    if (result.ok) emitChange()
    return result
  }, [])

  const transition = useCallback(
    async (taskId: string, nextState: TaskState) => {
      if (!isLive() && store.isCustomer()) return { ok: false, error: "Forbidden" }
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
      if (result.ok) {
        if (isLive()) {
          api.fetchTasks(eventId)
            .then((data) => { setLiveTasks(data); emitChange() })
            .catch(() => {})
        }
        emitChange()
      }
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
  const storeVersion = useStoreVersion()
  const [liveTemplates, setLiveTemplates] = useState<any[]>([])
  const [liveInstances, setLiveInstances] = useState<any[]>([])

  useEffect(() => {
    if (!isLive()) return
    let cancelled = false
    api.fetchWorkflowTemplates()
      .then((data) => { if (!cancelled) setLiveTemplates(data) })
      .catch((err) => console.error("fetchWorkflowTemplates failed:", err))
    api.fetchWorkflowInstances()
      .then((data) => { if (!cancelled) setLiveInstances(data) })
      .catch((err) => console.error("fetchWorkflowInstances failed:", err))
    return () => { cancelled = true }
  }, [storeVersion])

  const templates = isLive() ? liveTemplates : [...store.workflowTemplates]
  const instances = isLive() ? liveInstances : [...store.workflowInstances]

  const saveTemplate = useCallback(async (template: WorkflowTemplate) => {
    const result = await api.saveWorkflowTemplate(template)
    if (result.ok) emitChange()
    return result
  }, [])

  const instantiate = useCallback(
    async (workflowId: string, eventId: string, nodes?: any[], edges?: any[]) => {
      const result = await api.instantiateWorkflow(workflowId, eventId, nodes, edges)
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
  const storeVersion = useStoreVersion()
  const [liveUsers, setLiveUsers] = useState<any[]>([])
  const [liveUserTypes, setLiveUserTypes] = useState<any[]>([])
  const [liveTaskTypes, setLiveTaskTypes] = useState<any[]>([])
  const [liveEligibility, setLiveEligibility] = useState<any[]>([])
  const [liveEventMembers, setLiveEventMembers] = useState<any[]>([])

  useEffect(() => {
    if (!isLive()) return
    let cancelled = false
    api.fetchUsers()
      .then((data) => { if (!cancelled) setLiveUsers(data) })
      .catch((err) => console.error("fetchUsers failed:", err))
    api.fetchUserTypes()
      .then((data) => { if (!cancelled) setLiveUserTypes(data) })
      .catch((err) => console.error("fetchUserTypes failed:", err))
    api.fetchTaskTypes()
      .then((data) => { if (!cancelled) setLiveTaskTypes(data) })
      .catch((err) => console.error("fetchTaskTypes failed:", err))
    api.fetchEligibilityMappings()
      .then((data) => { if (!cancelled) setLiveEligibility(data) })
      .catch((err) => console.error("fetchEligibilityMappings failed:", err))
    return () => { cancelled = true }
  }, [storeVersion])

  return isLive()
    ? {
        users: liveUsers,
        userTypes: liveUserTypes,
        taskTypes: liveTaskTypes,
        eligibilityMappings: liveEligibility,
        eventMembers: liveEventMembers,
      }
    : {
        users: [...store.users],
        userTypes: [...store.userTypes],
        taskTypes: [...store.taskTypes],
        eligibilityMappings: [...store.eligibilityMappings],
        eventMembers: [...store.eventMembers],
      }
}
