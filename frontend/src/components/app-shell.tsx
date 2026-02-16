"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/src/hooks/use-eventflow"
import { PersonaSwitcher } from "./persona-switcher"
import {
  LayoutGrid,
  ListTodo,
  GitBranch,
  Settings,
  Calendar,
  Zap,
} from "lucide-react"

export type NavTab =
  | "kanban"
  | "todo"
  | "workflow"
  | "events"
  | "settings"

interface AppShellProps {
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
  children: React.ReactNode
  selectedEventId: string | null
  selectedEventName: string | null
}

const navItems: {
  id: NavTab
  label: string
  icon: React.ElementType
  customerHidden?: boolean
}[] = [
  { id: "kanban", label: "Kanban", icon: LayoutGrid },
  { id: "todo", label: "Todo", icon: ListTodo, customerHidden: true },
  { id: "workflow", label: "Workflow", icon: GitBranch },
  { id: "events", label: "Events", icon: Calendar },
  { id: "settings", label: "Settings", icon: Settings },
]

export function AppShell({
  activeTab,
  onTabChange,
  children,
  selectedEventId,
  selectedEventName,
}: AppShellProps) {
  const { user, userType, isAdmin, isCustomer } = useAuth()

  const filteredNav = navItems.filter((item) => {
    if (isCustomer && item.customerHidden) return false
    return true
  })

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold text-foreground">EventFlow</span>
          </div>
          {selectedEventName && (
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium text-foreground">{selectedEventName}</span>
            </div>
          )}
        </div>

        <PersonaSwitcher />
      </header>

      {/* Customer Read-Only Banner */}
      {isCustomer && (
        <div className="flex items-center justify-center gap-2 bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <span>Read-only mode</span>
          <span className="text-muted-foreground/50">|</span>
          <span>Customer accounts cannot modify tasks or assignments</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Bottom Navigation (mobile-first, WhatsApp-style) */}
      <nav className="flex flex-shrink-0 items-center justify-around border-t border-border bg-card px-1 py-1.5 sm:px-4">
        {filteredNav.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isActive && "drop-shadow-[0_0_6px_hsl(var(--primary))]"
                )}
              />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
