"use client"

import { useEvents, useWorkflows, useTasks, useAuth, useReferenceData } from "@/src/hooks/use-eventflow"
import { store } from "@/src/data/store"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Users,
  CheckCircle2,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react"

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
import { useState } from "react"
import { toast } from "sonner"

interface EventsViewProps {
  selectedEventId: string | null
  onSelectEvent: (eventId: string | null) => void
}

export function EventsView({ selectedEventId, onSelectEvent }: EventsViewProps) {
  const { events, create: createEvent, update: updateEvent, remove: deleteEvent } = useEvents()
  const { templates, instances, instantiate, getProgress } = useWorkflows()
  const { allTasks } = useTasks()
  const { isAdmin } = useAuth()
  const { eventMembers, users } = useReferenceData()

  // Create dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newEventName, setNewEventName] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editEventId, setEditEventId] = useState("")
  const [editEventName, setEditEventName] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteEventId, setDeleteEventId] = useState("")
  const [deleteEventName, setDeleteEventName] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) return

    setIsCreating(true)
    const result = await createEvent(newEventName)

    if (result.ok && result.eventId) {
      // If a workflow template was selected, instantiate it for the new event
      if (selectedTemplateId) {
        const selectedTemplate = templates.find(
          (t: any) => t.id === selectedTemplateId || t.workflow_id === selectedTemplateId
        )
        const instResult = await instantiate(
          selectedTemplateId,
          result.eventId,
          selectedTemplate?.nodes,
          selectedTemplate?.edges
        )
        if (instResult.ok) {
          toast.success("Event created with workflow tasks!")
        } else {
          toast.success("Event created, but workflow failed: " + (instResult.error || ""))
        }
      } else {
        toast.success("Event created successfully")
      }

      setIsDialogOpen(false)
      setNewEventName("")
      setSelectedTemplateId("")
      onSelectEvent(result.eventId)
    } else {
      toast.error(result.error || "Failed to create event")
    }
    setIsCreating(false)
  }

  const handleEditEvent = async () => {
    if (!editEventName.trim() || !editEventId) return

    setIsUpdating(true)
    const result = await updateEvent(editEventId, editEventName)
    setIsUpdating(false)

    if (result.ok) {
      toast.success("Event updated successfully")
      setIsEditDialogOpen(false)
    } else {
      toast.error(result.error || "Failed to update event")
    }
  }

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return

    setIsDeleting(true)
    const result = await deleteEvent(deleteEventId)
    setIsDeleting(false)

    if (result.ok) {
      toast.success("Event deleted successfully")
      setIsDeleteDialogOpen(false)
      if (selectedEventId === deleteEventId) {
        onSelectEvent(null)
      }
    } else {
      toast.error(result.error || "Failed to delete event")
    }
  }

  const openEdit = (evtId: string, evtName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditEventId(evtId)
    setEditEventName(evtName)
    setIsEditDialogOpen(true)
  }

  const openDelete = (evtId: string, evtName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteEventId(evtId)
    setDeleteEventName(evtName)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Events</h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "All events (Admin view)" : "Your scoped events"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedEventId && (
            <button
              onClick={() => onSelectEvent(null)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              Show All
            </button>
          )}

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) { setNewEventName(""); setSelectedTemplateId("") }
          }}>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
                <DialogDescription>
                  Give your event a name and optionally select a workflow template to auto-create tasks.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Event Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Riya & Arjun Wedding"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateEvent()}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Workflow Template</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a workflow (optional)" />
                    </SelectTrigger>
                      <SelectContent>
                      {(!templates || templates.length === 0) && (
                        <SelectItem value="none" disabled>No templates available</SelectItem>
                      )}
                      {templates.map((t: any) => (
                        <SelectItem key={t.id || t.workflow_id} value={t.id || t.workflow_id}>
                          {t.name} {t.nodes?.length ? `(${t.nodes.length} tasks)` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplateId && (() => {
                    const t = templates.find((t: any) => (t.id || t.workflow_id) === selectedTemplateId)
                    return t?.nodes?.length ? (
                      <p className="text-xs text-muted-foreground">
                        {t.nodes.length} tasks and {t.edges?.length || 0} dependencies will be created automatically.
                      </p>
                    ) : null
                  })()}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateEvent}
                  disabled={isCreating || !newEventName.trim()}
                >
                  {isCreating ? "Creating..." : selectedTemplateId ? "Create Event + Tasks" : "Create Event"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3">
          {events.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Calendar className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No events available</p>
            </div>
          ) : (
            events.map((evt) => {
              const isSelected = selectedEventId === evt.id
              const members = eventMembers.filter((em) => em.event_id === evt.id)
              const wfInstances = instances.filter((i) => i.event_id === evt.id)
              const eventTasks = allTasks.filter((t: any) => t.event_id === evt.id)
              const doneTasks = eventTasks.filter((t: any) => t.state === "DONE")
              const overallProgress =
                eventTasks.length > 0
                  ? Math.round((doneTasks.length / eventTasks.length) * 100)
                  : 0

              return (
                <button
                  key={evt.id}
                  onClick={() => onSelectEvent(isSelected ? null : evt.id)}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border p-4 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/20 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-card-foreground">
                        {evt.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {evt.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isAdmin && (
                        <>
                          <span
                            role="button"
                            onClick={(e) => openEdit(evt.id, evt.name, e)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Edit event"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </span>
                          <span
                            role="button"
                            onClick={(e) => openDelete(evt.id, evt.name, e)}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Delete event"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </span>
                        </>
                      )}
                      {isSelected && (
                        <Badge variant="default" className="ml-1 text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {members.length} members
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BarChart3 className="h-3 w-3" />
                      {wfInstances.length} workflows
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3" />
                      {doneTasks.length}/{eventTasks.length} tasks
                    </span>
                  </div>

                  {/* Progress */}
                  {eventTasks.length > 0 && (
                    <div className="flex items-center gap-3">
                      <Progress value={overallProgress} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {overallProgress}%
                      </span>
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update the event name.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Event Name</Label>
              <Input
                id="edit-name"
                value={editEventName}
                onChange={(e) => setEditEventName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditEvent()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditEvent}
              disabled={isUpdating || !editEventName.trim()}
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Event Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteEventName}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEvent}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
