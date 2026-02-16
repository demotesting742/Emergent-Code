"use client"

import { useState } from "react"
import { AuthProvider } from "@/src/hooks/auth-context"
import { AuthGate } from "@/src/components/auth-gate"
import { AppShell, type NavTab } from "@/src/components/app-shell"
import { KanbanView } from "@/src/features/kanban-view"
import { TodoView } from "@/src/features/todo-view"
import { WorkflowBuilder } from "@/src/features/workflow-builder"
import { EventsView } from "@/src/features/events-view"
import { SettingsView } from "@/src/features/settings-view"
import { TaskDetail } from "@/src/features/task-detail"
import type { Task } from "@/src/data/types"
import { useAuth, useEvents } from "@/src/hooks/use-eventflow"

function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>("kanban")
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const { isCustomer } = useAuth()
  const { events } = useEvents()

  const selectedEventName =
    events.find((e) => e.id === selectedEventId)?.name ?? null

  // Customer: force to kanban if they somehow navigate to todo
  const effectiveTab = isCustomer && activeTab === "todo" ? "kanban" : activeTab

  return (
    <AppShell
      activeTab={effectiveTab}
      onTabChange={setActiveTab}
      selectedEventId={selectedEventId}
      selectedEventName={selectedEventName}
    >
      {effectiveTab === "kanban" && (
        <KanbanView eventId={selectedEventId} onTaskSelect={setSelectedTask} />
      )}
      {effectiveTab === "todo" && (
        <TodoView eventId={selectedEventId} onTaskSelect={setSelectedTask} />
      )}
      {effectiveTab === "workflow" && <WorkflowBuilder />}
      {effectiveTab === "events" && (
        <EventsView
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEventId}
        />
      )}
      {effectiveTab === "settings" && <SettingsView />}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </AppShell>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <AuthGate>
        <AppContent />
      </AuthGate>
    </AuthProvider>
  )
}
