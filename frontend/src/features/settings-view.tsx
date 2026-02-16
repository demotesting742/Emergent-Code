"use client"

import { useConfig, useAuth, useReferenceData } from "@/src/hooks/use-eventflow"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Database,
  Globe,
  Users,
  Shield,
  RotateCcw,
  Tag,
  Link,
  Eye,
  Hand,
  ArrowRight,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"

export function SettingsView() {
  const { config, setDataMode } = useConfig()
  const { user, userType, isAdmin, resetData } = useAuth()
  const { users, userTypes, taskTypes, eligibilityMappings } = useReferenceData()

  const handleReset = () => {
    resetData()
    toast.success("All data reset to initial seed state")
  }

  if (!userType) return null

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configuration and system overview
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-6">
          {/* Current User Info */}
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">Current Account</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground">Name</span>
                <p className="text-sm font-medium text-card-foreground">{user?.name}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Email</span>
                <p className="text-sm font-medium text-card-foreground">{user?.email}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">UserType</span>
                <p className="text-sm font-medium text-card-foreground">{userType.name}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Access</span>
                <Badge variant={isAdmin ? "default" : "secondary"}>
                  {userType.access_level}
                </Badge>
              </div>
            </div>
            <Separator />
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Permissions
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { key: "view", icon: Eye, label: "View" },
                  { key: "take", icon: Hand, label: "Take" },
                  { key: "move_state", icon: ArrowRight, label: "Move State" },
                  { key: "assign", icon: UserPlus, label: "Assign" },
                ].map(({ key, icon: Icon, label }) => (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${userType.permissions[key as keyof typeof userType.permissions]
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground line-through"
                      }`}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Data Mode Toggle */}
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">Data Mode</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-card-foreground">
                  {config.dataMode === "mock" ? "Mock Mode" : "Live Mode"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {config.dataMode === "mock"
                    ? "Using seeded mock data with in-memory store"
                    : "Connecting to live API endpoints"}
                </p>
              </div>
              <Switch
                checked={config.dataMode === "live"}
                onCheckedChange={(checked) =>
                  setDataMode(checked ? "live" : "mock")
                }
              />
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">
                {config.apiBaseUrl}
              </span>
            </div>
          </section>

          {/* Mock Data Reset */}
          {config.dataMode === "mock" && (
            <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-card-foreground">Reset Mock Data</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Resets all tasks, events, and assignments to the initial seed state.
              </p>
              <Button variant="destructive" size="sm" onClick={handleReset} className="w-fit gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset All Data
              </Button>
            </section>
          )}

          {/* System Reference: UserTypes */}
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">UserTypes & Eligibility</h3>
            </div>
            <div className="flex flex-col gap-2">
              {userTypes.map((ut) => {
                const eligible = eligibilityMappings
                  .filter((em) => em.usertype_id === ut.id)
                  .map((em) => taskTypes.find((tt) => tt.id === em.tasktype_id)?.name)
                  .filter((name): name is string => !!name)

                return (
                  <div
                    key={ut.id}
                    className="flex flex-col gap-1 rounded-md bg-muted px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{ut.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {ut.access_level}
                      </Badge>
                    </div>
                    {eligible.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {eligible.map((name) => (
                          <span
                            key={name}
                            className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        No task type eligibility
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Task Types */}
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-card-foreground">Task Types</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {taskTypes.map((tt) => (
                <span
                  key={tt.id}
                  className="rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground"
                >
                  {tt.name}
                </span>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  )
}
