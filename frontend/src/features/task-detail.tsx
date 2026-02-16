"use client"

import type { Task } from "@/src/data/types"
import { VALID_TRANSITIONS } from "@/src/data/types"
import { useTasks, useAuth, useReferenceData } from "@/src/hooks/use-eventflow"
import { StateBadge } from "@/src/components/state-badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  X,
  Play,
  CheckCircle2,
  Hand,
  UserMinus,
  ArrowRight,
  Lock,
  FileText,
  User,
  Tag,
  GitBranch,
} from "lucide-react"
import { store } from "@/src/data/store"

interface TaskDetailProps {
  task: Task
  onClose: () => void
}

export function TaskDetail({ task, onClose }: TaskDetailProps) {
  const { pick, transition, assign } = useTasks()
  const { isAdmin, isCustomer, userType } = useAuth()
  const { users, taskTypes, userTypes, eligibilityMappings } = useReferenceData()

  if (!userType) return null

  const assignee = task.assignee_id
    ? users.find((u) => u.id === task.assignee_id)
    : null
  const taskType = taskTypes.find((tt) => tt.id === task.tasktype_id)

  const parentTasks = task.parent_ids
    .map((pid) => store.tasks.find((t) => t.id === pid))
    .filter(Boolean) as Task[]

  const childTasks = task.child_ids
    .map((cid) => store.tasks.find((t) => t.id === cid))
    .filter(Boolean) as Task[]

  const nextState = VALID_TRANSITIONS[task.state]

  // Eligible users for assignment (Admin only)
  const eligibleUsers = users.filter((u) => {
    const ut = userTypes.find((ut2) => ut2.id === u.usertype_id)
    if (!ut) return false
    return eligibilityMappings.some(
      (em) => em.usertype_id === ut.id && em.tasktype_id === task.tasktype_id
    )
  })

  const handlePick = async () => {
    const result = await pick(task.id)
    if (result.ok) toast.success("Task picked")
    else toast.error(result.error)
  }

  const handleTransition = async () => {
    if (!nextState) return
    const result = await transition(task.id, nextState)
    if (result.ok) toast.success(`Task moved to ${nextState}`)
    else toast.error(result.error)
  }

  const handleAssign = async (userId: string) => {
    const result = await assign(task.id, userId)
    if (result.ok) toast.success("Task assigned")
    else toast.error(result.error)
  }

  const handleUnassign = async () => {
    const result = await assign(task.id, null)
    if (result.ok) toast.success("Task unassigned")
    else toast.error(result.error)
  }

  const canPickThis = store.canTake(task)
  const canTransition =
    !isCustomer && userType.permissions.move_state && nextState !== null && task.state !== "LOCKED" && task.state !== "TODO"

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold text-card-foreground">Task Detail</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="flex flex-col gap-5">
            {/* Title + State */}
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-card-foreground">{task.label}</h2>
              <div className="flex items-center gap-2">
                <StateBadge state={task.state} size="md" />
                {nextState && !isCustomer && (
                  <span className="text-xs text-muted-foreground">
                    Next: {nextState}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </span>
              <p className="text-sm text-card-foreground">{task.description}</p>
            </div>

            <Separator />

            {/* Meta */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tag className="h-3 w-3" /> Task Type
                </span>
                <span className="text-sm font-medium text-card-foreground">
                  {taskType?.name || "Unknown"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" /> Assignee
                </span>
                <span className="text-sm font-medium text-card-foreground">
                  {assignee?.name || "Unassigned"}
                </span>
              </div>
            </div>

            {/* Dependencies */}
            {(parentTasks.length > 0 || childTasks.length > 0) && (
              <>
                <Separator />
                <div className="flex flex-col gap-3">
                  <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <GitBranch className="h-3 w-3" /> Dependencies
                  </span>
                  {parentTasks.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-muted-foreground">Parents:</span>
                      {parentTasks.map((pt) => (
                        <div
                          key={pt.id}
                          className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5"
                        >
                          <StateBadge state={pt.state} size="sm" />
                          <span className="text-xs text-foreground">{pt.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {childTasks.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-muted-foreground">Children:</span>
                      {childTasks.map((ct) => (
                        <div
                          key={ct.id}
                          className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5"
                        >
                          <StateBadge state={ct.state} size="sm" />
                          <span className="text-xs text-foreground">{ct.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Admin: Assignment */}
            {isAdmin && task.state !== "DONE" && (
              <>
                <Separator />
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Admin Assignment
                  </span>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={handleAssign}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignee && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleUnassign}
                        className="gap-1"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        Unassign
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Actions Footer */}
        {!isCustomer && (
          <div className="flex items-center gap-2 border-t border-border px-4 py-3">
            {canPickThis && (
              <Button onClick={handlePick} className="flex-1 gap-1.5">
                <Hand className="h-4 w-4" />
                Pick Task
              </Button>
            )}
            {canTransition && (
              <Button onClick={handleTransition} className="flex-1 gap-1.5">
                {nextState === "IN_PROGRESS" ? (
                  <Play className="h-4 w-4" />
                ) : nextState === "DONE" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {nextState === "IN_PROGRESS"
                  ? "Start"
                  : nextState === "DONE"
                    ? "Complete"
                    : `Move to ${nextState}`}
              </Button>
            )}
            {!canPickThis && !canTransition && (
              <p className="flex-1 text-center text-xs text-muted-foreground">
                {task.state === "LOCKED" ? (
                  <span className="flex items-center justify-center gap-1">
                    <Lock className="h-3 w-3" /> Waiting for parent tasks
                  </span>
                ) : task.state === "DONE" ? (
                  "Task completed"
                ) : (
                  "No actions available"
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
