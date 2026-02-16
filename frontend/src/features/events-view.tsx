"use client"

import { useEvents, useWorkflows, useAuth, useReferenceData } from "@/src/hooks/use-eventflow"
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
  const { events, create: createEvent } = useEvents()
  const { instances, getProgress } = useWorkflows()
  const { isAdmin } = useAuth()
  const { eventMembers, users } = useReferenceData()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newEventName, setNewEventName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) return

    setIsCreating(true)
    const result = await createEvent(newEventName)
    setIsCreating(false)

    if (result.ok) {
      toast.success("Event created successfully")
      setIsDialogOpen(false)
      setNewEventName("")
      if (result.eventId) onSelectEvent(result.eventId)
    } else {
      toast.error(result.error || "Failed to create event")
    }
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

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
                <DialogDescription>
                  Give your new event a name to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Event Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Summer Festival 2024"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateEvent()}
                  />
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
                  {isCreating ? "Creating..." : "Create Event"}
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
              const eventTasks = store.tasks.filter((t) => t.event_id === evt.id)
              const doneTasks = eventTasks.filter((t) => t.state === "DONE")
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
                    {isSelected && (
                      <Badge variant="default" className="flex-shrink-0 text-xs">
                        Active
                      </Badge>
                    )}
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
    </div>
  )
}
