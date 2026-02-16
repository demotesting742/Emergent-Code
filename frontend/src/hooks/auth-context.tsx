"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { store } from "@/src/data/store"
import type { User, UserType } from "@/src/data/types"

// ─── External store subscription for reactive updates ───
let listeners: (() => void)[] = []
let snapshot = 0

export function emitChange() {
  snapshot++
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function getSnapshot() {
  return snapshot
}

export function useStoreVersion() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// ─── Auth State ───

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  userType: UserType | null
  isAdmin: boolean
  isCustomer: boolean
  login: (userId: string) => void
  logout: () => void
  switchUser: (userId: string) => void
  resetData: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  useStoreVersion()

  const login = useCallback((userId: string) => {
    const user = store.users.find((u) => u.id === userId)
    if (!user) return
    store.currentUserId = userId
    setIsAuthenticated(true)
    emitChange()
  }, [])

  const logout = useCallback(() => {
    setIsAuthenticated(false)
    emitChange()
  }, [])

  const switchUser = useCallback((userId: string) => {
    const user = store.users.find((u) => u.id === userId)
    if (!user) return
    store.currentUserId = userId
    emitChange()
  }, [])

  const resetData = useCallback(() => {
    const currentId = store.currentUserId
    store.reset()
    store.currentUserId = currentId
    emitChange()
  }, [])

  const user = isAuthenticated ? store.getCurrentUser() : null
  const userType = isAuthenticated ? store.getCurrentUserType() : null
  const isAdmin = isAuthenticated ? store.isAdmin() : false
  const isCustomer = isAuthenticated ? store.isCustomer() : false

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        userType,
        isAdmin,
        isCustomer,
        login,
        logout,
        switchUser,
        resetData,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider")
  return ctx
}
