"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  useWorkflows,
  useAuth,
  useReferenceData,
  useEvents,
} from "@/src/hooks/use-eventflow"
import { store } from "@/src/data/store"
import type { WorkflowTemplate, WorkflowNode, WorkflowEdge } from "@/src/data/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Plus,
  Save,
  Play,
  Trash2,
  GripVertical,
  ArrowRight,
  GitBranch,
  Pencil,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// ─── DAG Visualizer (Canvas-based) ───

function DagCanvas({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
}: {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Layout: topological sort for layer assignment
  const getLayout = useCallback(() => {
    const layers: Record<string, number> = {}
    const children: Record<string, string[]> = {}
    const parents: Record<string, string[]> = {}

    nodes.forEach((n) => {
      children[n.node_id] = []
      parents[n.node_id] = []
    })
    edges.forEach((e) => {
      children[e.from_node_id]?.push(e.to_node_id)
      parents[e.to_node_id]?.push(e.from_node_id)
    })

    // BFS layers
    const roots = nodes.filter((n) => parents[n.node_id].length === 0)
    const queue = roots.map((n) => n.node_id)
    roots.forEach((n) => (layers[n.node_id] = 0))

    while (queue.length) {
      const curr = queue.shift()!
      for (const child of children[curr]) {
        const newLayer = (layers[curr] ?? 0) + 1
        if (layers[child] === undefined || newLayer > layers[child]) {
          layers[child] = newLayer
        }
        if (!queue.includes(child)) queue.push(child)
      }
    }

    // Group by layer
    const layerGroups: Record<number, string[]> = {}
    Object.entries(layers).forEach(([id, layer]) => {
      if (!layerGroups[layer]) layerGroups[layer] = []
      layerGroups[layer].push(id)
    })

    // Position nodes
    const positions: Record<string, { x: number; y: number }> = {}
    const layerKeys = Object.keys(layerGroups)
      .map(Number)
      .sort((a, b) => a - b)

    layerKeys.forEach((layer) => {
      const group = layerGroups[layer]
      group.forEach((id, i) => {
        positions[id] = {
          x: 80 + layer * 200,
          y: 60 + i * 90 + (layerKeys.length > 1 ? 0 : 40),
        }
      })
    })

    return positions
  }, [nodes, edges])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height)

    const positions = getLayout()

    // Draw edges
    ctx.strokeStyle = "hsl(220, 10%, 35%)"
    ctx.lineWidth = 2
    edges.forEach((edge) => {
      const from = positions[edge.from_node_id]
      const to = positions[edge.to_node_id]
      if (!from || !to) return

      ctx.beginPath()
      ctx.moveTo(from.x + 70, from.y + 25)
      // Bezier curve
      const midX = (from.x + 70 + to.x) / 2
      ctx.bezierCurveTo(midX, from.y + 25, midX, to.y + 25, to.x, to.y + 25)
      ctx.stroke()

      // Arrowhead
      const angle = Math.atan2(to.y + 25 - from.y - 25, to.x - from.x - 70)
      ctx.fillStyle = "hsl(220, 10%, 35%)"
      ctx.beginPath()
      ctx.moveTo(to.x, to.y + 25)
      ctx.lineTo(to.x - 8 * Math.cos(angle - 0.4), to.y + 25 - 8 * Math.sin(angle - 0.4))
      ctx.lineTo(to.x - 8 * Math.cos(angle + 0.4), to.y + 25 - 8 * Math.sin(angle + 0.4))
      ctx.closePath()
      ctx.fill()
    })

    // Draw nodes
    nodes.forEach((node) => {
      const pos = positions[node.node_id]
      if (!pos) return

      const isSelected = node.node_id === selectedNodeId

      // Node box
      ctx.fillStyle = isSelected ? "hsl(199, 89%, 48%)" : "hsl(220, 20%, 14%)"
      ctx.strokeStyle = isSelected ? "hsl(199, 89%, 48%)" : "hsl(220, 16%, 22%)"
      ctx.lineWidth = isSelected ? 2 : 1

      const radius = 8
      const width = 140
      const height = 50
      ctx.beginPath()
      ctx.moveTo(pos.x + radius, pos.y)
      ctx.lineTo(pos.x + width - radius, pos.y)
      ctx.quadraticCurveTo(pos.x + width, pos.y, pos.x + width, pos.y + radius)
      ctx.lineTo(pos.x + width, pos.y + height - radius)
      ctx.quadraticCurveTo(pos.x + width, pos.y + height, pos.x + width - radius, pos.y + height)
      ctx.lineTo(pos.x + radius, pos.y + height)
      ctx.quadraticCurveTo(pos.x, pos.y + height, pos.x, pos.y + height - radius)
      ctx.lineTo(pos.x, pos.y + radius)
      ctx.quadraticCurveTo(pos.x, pos.y, pos.x + radius, pos.y)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Label
      ctx.fillStyle = isSelected ? "hsl(0, 0%, 100%)" : "hsl(220, 10%, 85%)"
      ctx.font = "12px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      const label =
        node.label.length > 16
          ? node.label.substring(0, 16) + "..."
          : node.label
      ctx.fillText(label, pos.x + 70, pos.y + 25)
    })
  }, [nodes, edges, selectedNodeId, getLayout])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const positions = getLayout()

    for (const node of nodes) {
      const pos = positions[node.node_id]
      if (!pos) continue
      if (x >= pos.x && x <= pos.x + 140 && y >= pos.y && y <= pos.y + 50) {
        onSelectNode(node.node_id)
        return
      }
    }
    onSelectNode(null)
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="h-full w-full cursor-crosshair rounded-lg border border-border bg-card"
      style={{ minHeight: 300 }}
    />
  )
}

// ─── Workflow Builder Feature ───

export function WorkflowBuilder() {
  const { templates, saveTemplate, instantiate, getProgress, instances } = useWorkflows()
  const { isAdmin, isCustomer } = useAuth()
  const { taskTypes } = useReferenceData()
  const { events } = useEvents()

  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)

  useEffect(() => {
    if (!selectedTemplate && templates.length > 0) {
      setSelectedTemplate(templates[0])
    }
  }, [templates, selectedTemplate])

  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showInstantiateDialog, setShowInstantiateDialog] = useState(false)
  const [instantiateEventId, setInstantiateEventId] = useState<string>("")
  const [showAddNodeDialog, setShowAddNodeDialog] = useState(false)
  const [showAddEdgeDialog, setShowAddEdgeDialog] = useState(false)

  // New node form
  const [newNodeLabel, setNewNodeLabel] = useState("")
  const [newNodeTaskType, setNewNodeTaskType] = useState("")
  const [newNodeDesc, setNewNodeDesc] = useState("")

  // New edge form
  const [edgeFrom, setEdgeFrom] = useState("")
  const [edgeTo, setEdgeTo] = useState("")

  const activeTemplate = editingTemplate || selectedTemplate

  const handleSave = async () => {
    if (!editingTemplate) return
    const result = await saveTemplate(editingTemplate)
    if (result.ok) {
      toast.success("Template saved")
      setSelectedTemplate(editingTemplate)
      setEditingTemplate(null)
    } else {
      toast.error(result.error || "Failed to save")
    }
  }

  const handleInstantiate = async () => {
    if (!selectedTemplate || !instantiateEventId) return
    const result = await instantiate(
      selectedTemplate.workflow_id,
      instantiateEventId,
      selectedTemplate.nodes,
      selectedTemplate.edges
    )
    if (result.ok) {
      toast.success("Workflow instantiated")
      setShowInstantiateDialog(false)
    } else {
      toast.error(result.error || "Failed to instantiate")
    }
  }

  const startEditing = () => {
    if (!selectedTemplate) return
    setEditingTemplate(JSON.parse(JSON.stringify(selectedTemplate)))
  }

  const addNode = () => {
    if (!editingTemplate || !newNodeLabel || !newNodeTaskType) return
    const nodeId = `node_${Date.now()}`
    const newNode: WorkflowNode = {
      node_id: nodeId,
      task_type_id: newNodeTaskType,
      label: newNodeLabel,
      metadata: { description: newNodeDesc || newNodeLabel, estimated_duration_hours: 1 },
    }
    setEditingTemplate({
      ...editingTemplate,
      nodes: [...editingTemplate.nodes, newNode],
    })
    setNewNodeLabel("")
    setNewNodeTaskType("")
    setNewNodeDesc("")
    setShowAddNodeDialog(false)
    toast.success("Node added")
  }

  const addEdge = () => {
    if (!editingTemplate || !edgeFrom || !edgeTo || edgeFrom === edgeTo) return
    // Check duplicate
    const exists = editingTemplate.edges.some(
      (e) => e.from_node_id === edgeFrom && e.to_node_id === edgeTo
    )
    if (exists) {
      toast.error("Edge already exists")
      return
    }
    setEditingTemplate({
      ...editingTemplate,
      edges: [...editingTemplate.edges, { from_node_id: edgeFrom, to_node_id: edgeTo }],
    })
    setEdgeFrom("")
    setEdgeTo("")
    setShowAddEdgeDialog(false)
    toast.success("Edge added")
  }

  const removeNode = (nodeId: string) => {
    if (!editingTemplate) return
    setEditingTemplate({
      ...editingTemplate,
      nodes: editingTemplate.nodes.filter((n) => n.node_id !== nodeId),
      edges: editingTemplate.edges.filter(
        (e) => e.from_node_id !== nodeId && e.to_node_id !== nodeId
      ),
    })
    if (selectedNodeId === nodeId) setSelectedNodeId(null)
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Workflow Builder</h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Create and manage DAG-based workflow templates" : "View workflow templates"}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
        {/* Sidebar: template list */}
        <div className="flex flex-col gap-2 lg:w-64">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Templates
          </span>
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-1.5">
              {templates.map((t) => {
                const instanceCount = instances.filter(
                  (i) => i.workflow_id === t.workflow_id
                ).length
                return (
                  <button
                    key={t.workflow_id}
                    onClick={() => {
                      setSelectedTemplate(t)
                      setEditingTemplate(null)
                      setSelectedNodeId(null)
                    }}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
                      selectedTemplate?.workflow_id === t.workflow_id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.nodes.length} nodes, {t.edges.length} edges
                      {instanceCount > 0 && ` | ${instanceCount} instances`}
                    </span>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Main: DAG canvas + controls */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          {activeTemplate ? (
            <>
              {/* Action bar */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                </span>
                <div className="ml-auto flex gap-2">
                  {isAdmin && !editingTemplate && (
                    <>
                      <Button size="sm" variant="outline" onClick={startEditing} className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowInstantiateDialog(true)}
                        className="gap-1.5"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Instantiate
                      </Button>
                    </>
                  )}
                  {editingTemplate && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setShowAddNodeDialog(true)} className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Node
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAddEdgeDialog(true)} className="gap-1.5">
                        <ArrowRight className="h-3.5 w-3.5" />
                        Edge
                      </Button>
                      <Button size="sm" onClick={handleSave} className="gap-1.5">
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingTemplate(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 overflow-hidden rounded-lg">
                <DagCanvas
                  nodes={activeTemplate.nodes}
                  edges={activeTemplate.edges}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={setSelectedNodeId}
                />
              </div>

              {/* Node list */}
              <div className="flex flex-col gap-1 max-h-40 overflow-auto">
                {activeTemplate.nodes.map((node) => {
                  const tt = taskTypes.find((t) => t.id === node.task_type_id)
                  return (
                    <div
                      key={node.node_id}
                      onClick={() => setSelectedNodeId(node.node_id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm cursor-pointer",
                        selectedNodeId === node.node_id
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <GitBranch className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="flex-1 truncate">{node.label}</span>
                      <span className="text-xs">{tt?.name}</span>
                      {editingTemplate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNode(node.node_id)
                          }}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a template to view
            </div>
          )}
        </div>
      </div>

      {/* Instantiate Dialog */}
      <Dialog open={showInstantiateDialog} onOpenChange={setShowInstantiateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instantiate Workflow</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Select an event to create a new workflow instance for{" "}
              <strong>{selectedTemplate?.name}</strong>
            </p>
            <Select value={instantiateEventId} onValueChange={setInstantiateEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Select event..." />
              </SelectTrigger>
              <SelectContent>
                {events.map((evt) => (
                  <SelectItem key={evt.id} value={evt.id}>
                    {evt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstantiateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInstantiate} disabled={!instantiateEventId}>
              Create Instance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Node Dialog */}
      <Dialog open={showAddNodeDialog} onOpenChange={setShowAddNodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Node</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Input
              placeholder="Task label"
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
            />
            <Select value={newNodeTaskType} onValueChange={setNewNodeTaskType}>
              <SelectTrigger>
                <SelectValue placeholder="Select task type..." />
              </SelectTrigger>
              <SelectContent>
                {taskTypes.map((tt) => (
                  <SelectItem key={tt.id} value={tt.id}>
                    {tt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Description (optional)"
              value={newNodeDesc}
              onChange={(e) => setNewNodeDesc(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNodeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addNode} disabled={!newNodeLabel || !newNodeTaskType}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Edge Dialog */}
      <Dialog open={showAddEdgeDialog} onOpenChange={setShowAddEdgeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Dependency Edge</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Select value={edgeFrom} onValueChange={setEdgeFrom}>
              <SelectTrigger>
                <SelectValue placeholder="From node..." />
              </SelectTrigger>
              <SelectContent>
                {editingTemplate?.nodes.map((n) => (
                  <SelectItem key={n.node_id} value={n.node_id}>
                    {n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <Select value={edgeTo} onValueChange={setEdgeTo}>
              <SelectTrigger>
                <SelectValue placeholder="To node..." />
              </SelectTrigger>
              <SelectContent>
                {editingTemplate?.nodes.map((n) => (
                  <SelectItem key={n.node_id} value={n.node_id}>
                    {n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEdgeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addEdge} disabled={!edgeFrom || !edgeTo || edgeFrom === edgeTo}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
