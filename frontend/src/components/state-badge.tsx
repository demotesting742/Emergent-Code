"use client"

import type { TaskState } from "@/src/data/types"
import { cn } from "@/lib/utils"
import { Lock, Circle, UserCheck, Play, CheckCircle2 } from "lucide-react"

const stateConfig: Record<
  TaskState,
  { label: string; className: string; icon: React.ElementType }
> = {
  LOCKED: {
    label: "Locked",
    className: "bg-muted text-muted-foreground",
    icon: Lock,
  },
  TODO: {
    label: "To Do",
    className: "bg-primary/15 text-primary",
    icon: Circle,
  },
  ASSIGNED: {
    label: "Assigned",
    className: "bg-warning/15 text-warning",
    icon: UserCheck,
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-accent text-accent-foreground",
    icon: Play,
  },
  DONE: {
    label: "Done",
    className: "bg-success/15 text-success",
    icon: CheckCircle2,
  },
}

export function StateBadge({
  state,
  size = "sm",
}: {
  state: TaskState
  size?: "sm" | "md"
}) {
  const config = stateConfig[state]
  const Icon = config.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        config.className
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      {config.label}
    </span>
  )
}
