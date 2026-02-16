"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { store } from "@/src/data/store"
import type { User, UserType } from "@/src/data/types"
import { supabase } from "@/src/lib/supabase"
import type { Session } from "@supabase/supabase-js"

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
  login: (userId: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>
  logout: () => Promise<void>
  switchUser: (userId: string) => void
  resetData: () => void
  session: Session | null
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  useStoreVersion()

  // Initialize session and listen for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession)
      if (currentSession) {
        setIsAuthenticated(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession)
        setIsAuthenticated(!!currentSession)
        emitChange()
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (userId: string) => {
    // For now, keep the mock logic but this is where real auth would go
    const user = store.users.find((u) => u.id === userId)
    if (!user) return
    store.currentUserId = userId
    setIsAuthenticated(true)
    emitChange()
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (!error && data.session) {
      setSession(data.session)
      setIsAuthenticated(true)
      emitChange()
    }
    return { error }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
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
        signInWithEmail,
        logout,
        switchUser,
        resetData,
        session,
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
