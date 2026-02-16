"use client"

import { useAuth, useReferenceData } from "@/src/hooks/use-eventflow"
import { cn } from "@/lib/utils"
import { Shield, User, Eye, Truck, Users, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const personaIcons: Record<string, React.ElementType> = {
  SystemAdmin: Shield,
  EventManager: User,
  Vendor: Truck,
  Customer: Eye,
  Coordinator: Users,
}

const personaColors: Record<string, string> = {
  SystemAdmin: "bg-primary text-primary-foreground",
  EventManager: "bg-success text-success-foreground",
  Vendor: "bg-warning text-warning-foreground",
  Customer: "bg-muted text-muted-foreground",
  Coordinator: "bg-accent text-accent-foreground",
}

export function PersonaSwitcher() {
  const { user, userType, switchUser, logout, isAdmin } = useAuth()
  const { users, userTypes } = useReferenceData()

  if (!user || !userType) return null

  const Icon = personaIcons[userType.name] || User

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
            personaColors[userType.name]
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{user.name}</span>
          <span className="sm:hidden">{userType.name}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0" sideOffset={8}>
        <div className="flex flex-col">
          {/* Current user info */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                personaColors[userType.name]
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                {user.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {userType.name} &middot;{" "}
                <span className={isAdmin ? "text-primary" : ""}>
                  {userType.access_level}
                </span>
              </span>
            </div>
          </div>

          {/* Persona switch list */}
          <div className="flex flex-col gap-0.5 p-1.5">
            <span className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Switch Persona
            </span>
            {users.map((u) => {
              const ut = userTypes.find((ut) => ut.id === u.usertype_id)
              if (!ut) return null
              const PIcon = personaIcons[ut.name] || User
              const isActive = u.id === user.id

              return (
                <button
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                    isActive
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <PIcon className="h-3.5 w-3.5" />
                  <span className="flex-1 text-xs font-medium">{u.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {ut.name}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Logout */}
          <div className="border-t border-border p-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
