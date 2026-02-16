// ─── OpenAPI-derived types (single source of truth for all shapes) ───

import { components } from "../services/api-types"

export type AccessLevel = components["schemas"]["AccessLevel"]
export type TaskState = components["schemas"]["TaskState"]
export type UserType = components["schemas"]["UserType"]
export type User = components["schemas"]["User"]
export type TaskType = components["schemas"]["TaskType"]
export type EligibilityMapping = components["schemas"]["EligibilityMapping"]
export type Event = components["schemas"]["Event"]
export type EventMember = components["schemas"]["EventMember"]
export type WorkflowTemplate = components["schemas"]["WorkflowTemplate"]
export type WorkflowNode = components["schemas"]["WorkflowNode"]
export type WorkflowEdge = components["schemas"]["WorkflowEdge"]
export type WorkflowInstance = components["schemas"]["WorkflowInstance"]
export type Task = components["schemas"]["Task"]

// ─── Canonical Formulas (PRD Section: Task System Rules) ───

export interface CanonicalChecks {
  has_scope: boolean
  visible_in_todo: boolean
  can_take: boolean
}

// ─── App Config ───

export type DataMode = "mock" | "live"

export interface AppConfig {
  dataMode: DataMode
  apiBaseUrl: string
}

// ─── State Machine (PRD: exactly these transitions) ───

export const VALID_TRANSITIONS: Record<TaskState, TaskState | null> = {
  LOCKED: "TODO",
  TODO: "ASSIGNED",
  ASSIGNED: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: null,
}

export const STATE_ORDER: TaskState[] = [
  "LOCKED",
  "TODO",
  "ASSIGNED",
  "IN_PROGRESS",
  "DONE",
]
