"use client"

import type { Task } from "@/src/data/types"
import { StateBadge } from "./state-badge"
import { useReferenceData, useAuth } from "@/src/hooks/use-eventflow"
import { cn } from "@/lib/utils"
import { Clock, User } from "lucide-react"

interface TaskCardProps {
  task: Task
  onClick?: () => void
  compact?: boolean
  draggable?: boolean
}

export function TaskCard({ task, onClick, compact = false, draggable = false }: TaskCardProps) {
  const { users, taskTypes } = useReferenceData()
  const assignee = task.assignee_id
    ? users.find((u) => u.id === task.assignee_id)
    : null
  const taskType = taskTypes.find((tt) => tt.id === task.tasktype_id)

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      className={cn(
        "group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md",
        compact && "p-2"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-medium text-card-foreground truncate", compact ? "text-sm" : "text-sm")}>
            {task.label}
          </h4>
          {!compact && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        <StateBadge state={task.state} size="sm" />
      </div>

      <div className="mt-2 flex items-center gap-3">
        {taskType && (
          <span className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
            {taskType.name}
          </span>
        )}
        {assignee && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {assignee.name}
          </span>
        )}
      </div>
    </div>
  )
}
