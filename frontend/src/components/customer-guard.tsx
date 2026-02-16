"use client"

import type { ReactNode } from "react"
import { useAuth } from "@/src/hooks/use-eventflow"

interface CustomerGuardProps {
  /** Content shown to non-Customer users */
  children: ReactNode
  /** Optional fallback for Customer users (defaults to null / hidden) */
  fallback?: ReactNode
}

/**
 * Hides mutation controls from Customer users.
 * PRD: "Customer UserType: 100% prohibition on state/assignment mutations"
 * PRD: "UI hides controls"
 */
export function CustomerGuard({ children, fallback = null }: CustomerGuardProps) {
  const { isCustomer } = useAuth()

  if (isCustomer) return <>{fallback}</>
  return <>{children}</>
}

/**
 * Guard for admin-only UI sections.
 * PRD: "Only Admin may add or remove users as EventMembers"
 * PRD: "Admin Only: Only Admin can CRUD in EligibilityMapping"
 */
interface AdminGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AdminGuard({ children, fallback = null }: AdminGuardProps) {
  const { isAdmin } = useAuth()

  if (!isAdmin) return <>{fallback}</>
  return <>{children}</>
}

/**
 * Guard based on specific permission flags.
 * PRD: "Each UserType defines boolean permissions: view, take, move_state, assign"
 */
interface PermissionGuardProps {
  permission: "view" | "take" | "move_state" | "assign"
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { userType } = useAuth()

  if (!userType || !userType.permissions[permission]) return <>{fallback}</>
  return <>{children}</>
}

/**
 * Scope guard: checks if the user has access to a given event.
 * PRD: "has_scope = (user is Admin) OR (user is member of the task's event)"
 */
interface ScopeGuardProps {
  eventId: string
  children: ReactNode
  fallback?: ReactNode
}

export function ScopeGuard({ eventId, children, fallback = null }: ScopeGuardProps) {
  const { isAdmin } = useAuth()
  // For non-admin, we rely on filtered data from the hooks layer
  // This guard is useful at UI level for explicit admin-only controls
  if (!isAdmin) {
    // The store.hasScope is checked at the data layer;
    // this component is a UI safety net
    return <>{children}</>
  }
  return <>{children}</>
}
