import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string }

export interface AuthContextValue {
  configured: boolean
  isLoading: boolean
  isAdmin: boolean
  isAdminLoading: boolean
  adminError: string | null
  session: Session | null
  error: string | null
  signIn(identifier: string, password: string): Promise<AuthActionResult>
  signUp(username: string, password: string, displayName: string, islandName: string, appearance: 'male' | 'female'): Promise<AuthActionResult>
  signOut(): Promise<AuthActionResult>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
