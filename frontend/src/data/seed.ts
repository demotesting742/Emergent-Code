import type {
  UserType,
  User,
  TaskType,
  EligibilityMapping,
  Event,
  EventMember,
  WorkflowTemplate,
  WorkflowInstance,
  Task,
} from "./types"

// ─── UserTypes (PRD: exactly Admin + Regular variants) ───

export const userTypes: UserType[] = [
  {
    id: "ut_admin",
    name: "SystemAdmin",
    access_level: "admin",
    permissions: { view: true, take: true, move_state: true, assign: true },
  },
  {
    id: "ut_eventmgr",
    name: "EventManager",
    access_level: "regular",
    permissions: { view: true, take: true, move_state: true, assign: true },
  },
  {
    id: "ut_vendor",
    name: "Vendor",
    access_level: "regular",
    permissions: { view: true, take: true, move_state: true, assign: false },
  },
  {
    id: "ut_customer",
    name: "Customer",
    access_level: "regular",
    permissions: { view: true, take: false, move_state: false, assign: false },
  },
  {
    id: "ut_coordinator",
    name: "Coordinator",
    access_level: "regular",
    permissions: { view: true, take: true, move_state: true, assign: true },
  },
]

// ─── TaskTypes ───

export const taskTypes: TaskType[] = [
  { id: "tt_001", name: "Venue Booking" },
  { id: "tt_002", name: "Catering & AV" },
  { id: "tt_003", name: "Logistics" },
  { id: "tt_004", name: "Client Relations" },
  { id: "tt_005", name: "Coordination" },
]

// ─── EligibilityMappings (UserType -> TaskType) ───

export const eligibilityMappings: EligibilityMapping[] = [
  { usertype_id: "ut_admin", tasktype_id: "tt_001" },
  { usertype_id: "ut_admin", tasktype_id: "tt_002" },
  { usertype_id: "ut_admin", tasktype_id: "tt_003" },
  { usertype_id: "ut_admin", tasktype_id: "tt_004" },
  { usertype_id: "ut_admin", tasktype_id: "tt_005" },
  { usertype_id: "ut_eventmgr", tasktype_id: "tt_001" },
  { usertype_id: "ut_eventmgr", tasktype_id: "tt_002" },
  { usertype_id: "ut_eventmgr", tasktype_id: "tt_003" },
  { usertype_id: "ut_eventmgr", tasktype_id: "tt_005" },
  { usertype_id: "ut_vendor", tasktype_id: "tt_002" },
  { usertype_id: "ut_vendor", tasktype_id: "tt_003" },
  { usertype_id: "ut_coordinator", tasktype_id: "tt_003" },
  { usertype_id: "ut_coordinator", tasktype_id: "tt_005" },
]

// ─── Users (mock personas) ───

export const users: User[] = [
  { id: "u_admin", name: "Alex Admin", email: "alex@eventflow.io", usertype_id: "ut_admin", avatar_url: "" },
  { id: "u_mgr", name: "Morgan Manager", email: "morgan@eventflow.io", usertype_id: "ut_eventmgr", avatar_url: "" },
  { id: "u_vendor", name: "Val Vendor", email: "val@vendor.co", usertype_id: "ut_vendor", avatar_url: "" },
  { id: "u_customer", name: "Casey Customer", email: "casey@client.com", usertype_id: "ut_customer", avatar_url: "" },
  { id: "u_coord", name: "Chris Coordinator", email: "chris@eventflow.io", usertype_id: "ut_coordinator", avatar_url: "" },
]

// ─── Events ───

export const events: Event[] = [
  { id: "evt_001", name: "Annual Tech Conference 2026", description: "Main annual technology conference", created_at: "2026-01-15T10:00:00Z" },
  { id: "evt_002", name: "Product Launch Gala", description: "Premium product launch event", created_at: "2026-02-01T09:00:00Z" },
  { id: "evt_003", name: "Team Building Retreat", description: "Corporate team building weekend", created_at: "2026-02-10T08:00:00Z" },
]

// ─── EventMembers (scope) ───

export const eventMembers: EventMember[] = [
  // evt_001: Manager, Vendor, Customer, Coordinator
  { user_id: "u_mgr", event_id: "evt_001" },
  { user_id: "u_vendor", event_id: "evt_001" },
  { user_id: "u_customer", event_id: "evt_001" },
  { user_id: "u_coord", event_id: "evt_001" },
  // evt_002: Manager, Customer
  { user_id: "u_mgr", event_id: "evt_002" },
  { user_id: "u_customer", event_id: "evt_002" },
  // evt_003: Vendor, Coordinator
  { user_id: "u_vendor", event_id: "evt_003" },
  { user_id: "u_coord", event_id: "evt_003" },
]

// ─── Workflow Templates ───

export const workflowTemplates: WorkflowTemplate[] = [
  {
    workflow_id: "wf_001",
    name: "Venue Setup Workflow",
    version: 1,
    nodes: [
      { node_id: "task_001", task_type_id: "tt_001", label: "Book Venue", metadata: { description: "Secure venue contract", estimated_duration_hours: 2 } },
      { node_id: "task_002", task_type_id: "tt_002", label: "Order Catering", metadata: { description: "Finalize catering menu", estimated_duration_hours: 3 } },
      { node_id: "task_003", task_type_id: "tt_002", label: "Arrange AV Equipment", metadata: { description: "Confirm AV setup", estimated_duration_hours: 1 } },
      { node_id: "task_004", task_type_id: "tt_003", label: "Coordinate Delivery", metadata: { description: "Schedule deliveries", estimated_duration_hours: 2 } },
      { node_id: "task_005", task_type_id: "tt_001", label: "Final Walkthrough", metadata: { description: "Pre-event inspection", estimated_duration_hours: 1 } },
    ],
    edges: [
      { from_node_id: "task_001", to_node_id: "task_002" },
      { from_node_id: "task_001", to_node_id: "task_003" },
      { from_node_id: "task_002", to_node_id: "task_004" },
      { from_node_id: "task_003", to_node_id: "task_004" },
      { from_node_id: "task_004", to_node_id: "task_005" },
    ],
  },
  {
    workflow_id: "wf_002",
    name: "Client Onboarding",
    version: 1,
    nodes: [
      { node_id: "onb_001", task_type_id: "tt_004", label: "Initial Consultation", metadata: { description: "Meet with client to discuss requirements", estimated_duration_hours: 2 } },
      { node_id: "onb_002", task_type_id: "tt_005", label: "Assign Team", metadata: { description: "Assign coordination team", estimated_duration_hours: 1 } },
      { node_id: "onb_003", task_type_id: "tt_001", label: "Venue Selection", metadata: { description: "Present venue options to client", estimated_duration_hours: 3 } },
    ],
    edges: [
      { from_node_id: "onb_001", to_node_id: "onb_002" },
      { from_node_id: "onb_001", to_node_id: "onb_003" },
    ],
  },
]

// ─── Workflow Instances ───

export const workflowInstances: WorkflowInstance[] = [
  { id: "wi_001", workflow_id: "wf_001", event_id: "evt_001", created_at: "2026-01-20T10:00:00Z" },
  { id: "wi_002", workflow_id: "wf_002", event_id: "evt_002", created_at: "2026-02-05T09:00:00Z" },
]

// ─── Tasks (instantiated from workflow instances) ───

export const tasks: Task[] = [
  // wi_001 (Venue Setup for Tech Conference)
  { id: "t_001", workflow_instance_id: "wi_001", event_id: "evt_001", node_id: "task_001", tasktype_id: "tt_001", label: "Book Venue", description: "Secure venue contract", state: "DONE", assignee_id: "u_mgr", parent_ids: [], child_ids: ["t_002", "t_003"] },
  { id: "t_002", workflow_instance_id: "wi_001", event_id: "evt_001", node_id: "task_002", tasktype_id: "tt_002", label: "Order Catering", description: "Finalize catering menu", state: "IN_PROGRESS", assignee_id: "u_vendor", parent_ids: ["t_001"], child_ids: ["t_004"] },
  { id: "t_003", workflow_instance_id: "wi_001", event_id: "evt_001", node_id: "task_003", tasktype_id: "tt_002", label: "Arrange AV Equipment", description: "Confirm AV setup", state: "TODO", assignee_id: null, parent_ids: ["t_001"], child_ids: ["t_004"] },
  { id: "t_004", workflow_instance_id: "wi_001", event_id: "evt_001", node_id: "task_004", tasktype_id: "tt_003", label: "Coordinate Delivery", description: "Schedule deliveries", state: "LOCKED", assignee_id: null, parent_ids: ["t_002", "t_003"], child_ids: ["t_005"] },
  { id: "t_005", workflow_instance_id: "wi_001", event_id: "evt_001", node_id: "task_005", tasktype_id: "tt_001", label: "Final Walkthrough", description: "Pre-event inspection", state: "LOCKED", assignee_id: null, parent_ids: ["t_004"], child_ids: [] },
  // wi_002 (Client Onboarding for Product Launch)
  { id: "t_006", workflow_instance_id: "wi_002", event_id: "evt_002", node_id: "onb_001", tasktype_id: "tt_004", label: "Initial Consultation", description: "Meet with client", state: "ASSIGNED", assignee_id: "u_mgr", parent_ids: [], child_ids: ["t_007", "t_008"] },
  { id: "t_007", workflow_instance_id: "wi_002", event_id: "evt_002", node_id: "onb_002", tasktype_id: "tt_005", label: "Assign Team", description: "Assign coordination team", state: "LOCKED", assignee_id: null, parent_ids: ["t_006"], child_ids: [] },
  { id: "t_008", workflow_instance_id: "wi_002", event_id: "evt_002", node_id: "onb_003", tasktype_id: "tt_001", label: "Venue Selection", description: "Present venue options", state: "LOCKED", assignee_id: null, parent_ids: ["t_006"], child_ids: [] },
]
