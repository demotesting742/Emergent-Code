"use client"

import { useState, useRef, useCallback } from "react"
import { useTasks, useAuth, useReferenceData } from "@/src/hooks/use-eventflow"
import { TaskCard } from "@/src/components/task-card"
import type { Task, TaskState } from "@/src/data/types"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"


interface KanbanViewProps {
  eventId: string | null
  onTaskSelect: (task: Task) => void
}

const columns: { state: TaskState; label: string; color: string }[] = [
  { state: "ASSIGNED", label: "Assigned", color: "bg-warning" },
  { state: "IN_PROGRESS", label: "In Progress", color: "bg-primary" },
  { state: "DONE", label: "Done", color: "bg-success" },
]

export function KanbanView({ eventId, onTaskSelect }: KanbanViewProps) {
  const { assignedTasks, inProgressTasks, doneTasks, lockedTasks, transition, create: createTask } =
    useTasks(eventId ?? undefined)
  const { isCustomer } = useAuth()
  const { taskTypes } = useReferenceData()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    label: "",
    description: "",
    taskTypeId: "",
  })

  const handleCreateTask = async () => {
    if (!formData.label.trim() || !formData.taskTypeId) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsCreating(true)
    const result = await createTask(formData.taskTypeId, formData.label, formData.description)
    setIsCreating(false)

    if (result.ok) {
      toast.success("Task created successfully")
      setIsDialogOpen(false)
      setFormData({ label: "", description: "", taskTypeId: "" })
    } else {
      toast.error(result.error || "Failed to create task")
    }
  }


  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TaskState | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const dragCounter = useRef<Record<string, number>>({})

  const tasksByState: Record<string, Task[]> = {
    ASSIGNED: assignedTasks,
    IN_PROGRESS: inProgressTasks,
    DONE: doneTasks,
  }

  // Find which column a task lives in
  const findTaskById = useCallback(
    (taskId: string): Task | undefined => {
      return [...assignedTasks, ...inProgressTasks, ...doneTasks].find(
        (t) => t.id === taskId
      )
    },
    [assignedTasks, inProgressTasks, doneTasks]
  )

  // Check if a drop is valid (must be the next state in the state machine)
  const isValidDrop = useCallback(
    (taskId: string, targetState: TaskState): boolean => {
      const task = findTaskById(taskId)
      if (!task) return false
      const validTransitions: Record<TaskState, TaskState | null> = {
        LOCKED: "TODO",
        TODO: "ASSIGNED",
        ASSIGNED: "IN_PROGRESS",
        IN_PROGRESS: "DONE",
        DONE: null,
      }
      return validTransitions[task.state] === targetState
    },
    [findTaskById]
  )

  // ── Drag Handlers ──

  const handleDragStart = useCallback(
    (e: React.DragEvent, task: Task) => {
      if (isCustomer) {
        e.preventDefault()
        return
      }
      e.dataTransfer.setData("text/plain", task.id)
      e.dataTransfer.effectAllowed = "move"
      // Small delay so the dragged element renders before we apply dimming
      requestAnimationFrame(() => {
        setDraggedTaskId(task.id)
      })
    },
    [isCustomer]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null)
    setDragOverColumn(null)
    dragCounter.current = {}
  }, [])

  const handleDragEnter = useCallback(
    (e: React.DragEvent, columnState: TaskState) => {
      e.preventDefault()
      // Track enter/leave count per column so nested children don't flicker
      dragCounter.current[columnState] =
        (dragCounter.current[columnState] || 0) + 1
      if (draggedTaskId && isValidDrop(draggedTaskId, columnState)) {
        setDragOverColumn(columnState)
      }
    },
    [draggedTaskId, isValidDrop]
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent, columnState: TaskState) => {
      e.preventDefault()
      dragCounter.current[columnState] =
        (dragCounter.current[columnState] || 0) - 1
      if (dragCounter.current[columnState] <= 0) {
        dragCounter.current[columnState] = 0
        if (dragOverColumn === columnState) {
          setDragOverColumn(null)
        }
      }
    },
    [dragOverColumn]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, columnState: TaskState) => {
      e.preventDefault()
      if (draggedTaskId && isValidDrop(draggedTaskId, columnState)) {
        e.dataTransfer.dropEffect = "move"
      } else {
        e.dataTransfer.dropEffect = "none"
      }
    },
    [draggedTaskId, isValidDrop]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetState: TaskState) => {
      e.preventDefault()
      setDragOverColumn(null)
      dragCounter.current = {}

      const taskId = e.dataTransfer.getData("text/plain")
      if (!taskId || !isValidDrop(taskId, targetState)) {
        setDraggedTaskId(null)
        return
      }

      setIsTransitioning(true)
      const result = await transition(taskId, targetState)
      setIsTransitioning(false)
      setDraggedTaskId(null)

      if (result.ok) {
        toast.success(`Task moved to ${targetState.replace("_", " ")}`)
      } else {
        toast.error(result.error ?? "Failed to move task")
      }
    },
    [isValidDrop, transition]
  )

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Kanban Board
          </h2>
          <p className="text-sm text-muted-foreground">
            {isCustomer
              ? "Read-only view"
              : "Drag tasks between columns to update their state"}
          </p>
        </div>
        {lockedTasks.length > 0 && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {lockedTasks.length} locked
          </span>
        )}

        {eventId && !isCustomer && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Add a new task to this event.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="taskType">Task Type *</Label>
                  <Select
                    value={formData.taskTypeId}
                    onValueChange={(val) => setFormData(f => ({ ...f, taskTypeId: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {taskTypes.map(tt => (
                        <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="label">Label *</Label>
                  <Input
                    id="label"
                    placeholder="Task summary"
                    value={formData.label}
                    onChange={(e) => setFormData(f => ({ ...f, label: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Details about the task..."
                    value={formData.description}
                    onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTask}
                  disabled={isCreating || !formData.label.trim() || !formData.taskTypeId}
                >
                  {isCreating ? "Creating..." : "Create Task"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>


      {/* Mobile: stacked, Desktop: horizontal columns */}
      <div className="flex flex-1 flex-col gap-4 overflow-auto sm:flex-row">
        {columns.map((col) => {
          const tasks = tasksByState[col.state] || []
          const isDropTarget = dragOverColumn === col.state
          const canReceive =
            draggedTaskId !== null && isValidDrop(draggedTaskId, col.state)

          return (
            <div
              key={col.state}
              onDragEnter={(e) => handleDragEnter(e, col.state)}
              onDragLeave={(e) => handleDragLeave(e, col.state)}
              onDragOver={(e) => handleDragOver(e, col.state)}
              onDrop={(e) => handleDrop(e, col.state)}
              className={cn(
                "flex flex-1 flex-col rounded-xl border-2 bg-muted/30 transition-colors duration-200 sm:min-w-[260px]",
                isDropTarget
                  ? "border-primary bg-primary/5"
                  : canReceive
                    ? "border-dashed border-primary/40"
                    : "border-border",
                draggedTaskId &&
                !canReceive &&
                draggedTaskId !== null &&
                "opacity-50"
              )}
            >
              {/* Column Header */}
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <div className={cn("h-2.5 w-2.5 rounded-full", col.color)} />
                <h3 className="text-sm font-semibold text-foreground">
                  {col.label}
                </h3>
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {tasks.length}
                </span>
              </div>

              {/* Drop Hint */}
              {isDropTarget && (
                <div className="mx-3 mt-3 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/50 bg-primary/10 py-3 text-xs font-medium text-primary">
                  Drop here
                </div>
              )}

              {/* Cards */}
              <ScrollArea className="flex-1 p-3">
                <div className="flex flex-col gap-2">
                  {tasks.length === 0 && !isDropTarget ? (
                    <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                      No tasks
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        draggable={!isCustomer && task.state !== "DONE"}
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "transition-opacity duration-150",
                          draggedTaskId === task.id && "opacity-40",
                          !isCustomer &&
                          task.state !== "DONE" &&
                          "cursor-grab active:cursor-grabbing"
                        )}
                      >
                        <TaskCard
                          task={task}
                          onClick={() => onTaskSelect(task)}
                          compact
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )
        })}
      </div>
    </div>
  )
}
