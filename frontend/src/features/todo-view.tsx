"use client"

import { useTasks, useAuth } from "@/src/hooks/use-eventflow"
import { TaskCard } from "@/src/components/task-card"
import type { Task } from "@/src/data/types"
import { toast } from "sonner"
import { Hand, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TodoViewProps {
  eventId: string | null
  onTaskSelect: (task: Task) => void
}

export function TodoView({ eventId, onTaskSelect }: TodoViewProps) {
  const { todoTasks, pick } = useTasks(eventId ?? undefined)
  const { isCustomer, userType } = useAuth()

  if (!userType) return null

  // Customer guard: PRD requires Todo is never shown to Customer
  if (isCustomer) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Info className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Customer accounts cannot access the Todo view.
          </p>
        </div>
      </div>
    )
  }

  const handlePick = async (taskId: string) => {
    const result = await pick(taskId)
    if (result.ok) {
      toast.success("Task picked successfully")
    } else {
      toast.error(result.error || "Failed to pick task")
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Todo Queue</h2>
        <p className="text-sm text-muted-foreground">
          Tasks eligible for pickup based on your permissions and scope
        </p>
      </div>

      <ScrollArea className="flex-1">
        {todoTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Info className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No tasks available</p>
              <p className="text-xs text-muted-foreground">
                Check back when parent tasks are completed or new workflows are instantiated.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {todoTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3"
              >
                <div className="flex-1">
                  <TaskCard task={task} onClick={() => onTaskSelect(task)} />
                </div>
                {userType.permissions.take && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePick(task.id)
                    }}
                    className="flex-shrink-0 gap-1.5"
                  >
                    <Hand className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Pick</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
