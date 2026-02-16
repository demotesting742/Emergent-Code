"use client"

import { useState } from "react"
import { store } from "@/src/data/store"
import { useAuthContext } from "@/src/hooks/auth-context"
import { cn } from "@/lib/utils"
import { Shield, User, Truck, Eye, Users, Zap, LogIn, Mail, Lock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const personaIcons: Record<string, React.ElementType> = {
  SystemAdmin: Shield,
  EventManager: User,
  Vendor: Truck,
  Customer: Eye,
  Coordinator: Users,
}

const personaDescriptions: Record<string, string> = {
  SystemAdmin:
    "Full global access. CRUD for users, events, workflows, and tasks. Can assign/reassign across all events.",
  EventManager:
    "Scoped to assigned events. Can view, take, move state, and assign tasks within eligible scope.",
  Vendor:
    "Scoped to assigned events. Can take and progress eligible tasks. No assignment power.",
  Customer:
    "Read-only access. Can view Kanban progress for their events. Cannot modify any task or assignment.",
  Coordinator:
    "Scoped to assigned events. Coordinates inter-team tasks. Can take, move state, and assign.",
}

const personaAccentColors: Record<string, string> = {
  SystemAdmin: "border-primary bg-primary/5 hover:bg-primary/10",
  EventManager: "border-success bg-success/5 hover:bg-success/10",
  Vendor: "border-warning bg-warning/5 hover:bg-warning/10",
  Customer: "border-muted-foreground/30 bg-muted hover:bg-muted/80",
  Coordinator: "border-accent-foreground/30 bg-accent hover:bg-accent/80",
}

const personaSelectedColors: Record<string, string> = {
  SystemAdmin: "border-primary bg-primary/15 ring-2 ring-primary/40",
  EventManager: "border-success bg-success/15 ring-2 ring-success/40",
  Vendor: "border-warning bg-warning/15 ring-2 ring-warning/40",
  Customer:
    "border-muted-foreground bg-muted ring-2 ring-muted-foreground/40",
  Coordinator: "border-accent-foreground bg-accent ring-2 ring-accent-foreground/40",
}

export function LoginScreen() {
  const { login, signInWithEmail } = useAuthContext()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<"mock" | "real">("mock")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const allUsers = store.users
  const allUserTypes = store.userTypes

  const handleMockLogin = () => {
    if (selectedUserId) {
      login(selectedUserId)
    }
  }

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please enter email and password")
      return
    }

    setLoading(true)
    try {
      const { error } = await signInWithEmail(email, password)
      if (error) {
        toast.error(error.message || "Failed to sign in")
      } else {
        toast.success("Successfully signed in!")
      }
    } catch (err) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-8">
      <div className="flex w-full max-w-lg flex-col gap-8">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground">
              EventFlow
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Workflow Engine for Event Operations
            </p>
          </div>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex rounded-lg bg-muted p-1">
          <button
            onClick={() => setAuthMode("mock")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              authMode === "mock" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Mock Personas
          </button>
          <button
            onClick={() => setAuthMode("real")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              authMode === "real" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Supabase Login
          </button>
        </div>

        {authMode === "mock" ? (
          <>
            {/* Persona Cards */}
            <div className="flex flex-col gap-2">
              <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Select a persona to sign in
              </p>

              <div className="flex flex-col gap-2.5">
                {allUsers.map((u) => {
                  const ut = allUserTypes.find((ut) => ut.id === u.usertype_id)
                  if (!ut) return null
                  const Icon = personaIcons[ut.name] || User
                  const isSelected = selectedUserId === u.id
                  const desc = personaDescriptions[ut.name] ?? ""

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUserId(u.id)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                        isSelected
                          ? personaSelectedColors[ut.name]
                          : personaAccentColors[ut.name]
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
                          isSelected
                            ? "bg-foreground/10"
                            : "bg-foreground/5"
                        )}
                      >
                        <Icon className="h-4.5 w-4.5 text-foreground" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {u.name}
                          </span>
                          <span className="rounded bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {ut.name}
                          </span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-medium",
                              ut.access_level === "admin"
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {ut.access_level}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {desc}
                        </p>
                        {/* Permission chips */}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(
                            [
                              { key: "view", label: "View" },
                              { key: "take", label: "Take" },
                              { key: "move_state", label: "Move" },
                              { key: "assign", label: "Assign" },
                            ] as const
                          ).map(({ key, label }) => (
                            <span
                              key={key}
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                ut.permissions[key]
                                  ? "bg-success/15 text-success"
                                  : "bg-muted text-muted-foreground line-through"
                              )}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sign In Button */}
            <Button
              size="lg"
              className="w-full gap-2"
              disabled={!selectedUserId}
              onClick={handleMockLogin}
            >
              <LogIn className="h-4 w-4" />
              Sign In as Persona
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Mock mode: No credentials required. Pick any persona to explore their
              access level and permissions as defined in the PRD.
            </p>
          </>
        ) : (
          <form onSubmit={handleRealLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-lg border bg-background px-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border bg-background px-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>
            </div>

            <Button
              size="lg"
              className="w-full gap-2 mt-2"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In with Supabase"}
              {!loading && <LogIn className="h-4 w-4" />}
            </Button>

            <div className="mt-2 flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-primary" />
              <p>
                Use your Supabase project credentials to sign in. If you haven't created a user yet, you can do so in the Supabase Dashboard under <b>Authentication {">"} Users</b>.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
