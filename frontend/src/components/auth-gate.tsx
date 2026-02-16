"use client"

import type { ReactNode } from "react"
import { useAuthContext } from "@/src/hooks/auth-context"
import { LoginScreen } from "@/src/features/login-screen"

interface AuthGateProps {
  children: ReactNode
}

/**
 * Auth guard: renders the login screen when unauthenticated,
 * renders the app when authenticated.
 */
export function AuthGate({ children }: AuthGateProps) {
  const { isAuthenticated } = useAuthContext()

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return <>{children}</>
}
