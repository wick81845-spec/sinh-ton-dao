import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../server/database.types'
import { browserAuthConfig, createSupabaseBrowserClient } from '../../services/auth/supabaseBrowserClient'
import { isValidUsername, usernameToAuthEmail } from '../../services/auth/usernameAuth'
import { AuthContext, type AuthActionResult } from './authContext'

function describeAuthError(error: unknown): string {
  return error instanceof Error ? error.message : 'Không thể hoàn tất thao tác tài khoản.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient<Database> | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(browserAuthConfig))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!browserAuthConfig) return
    let active = true
    let unsubscribe = () => {}
    void createSupabaseBrowserClient().then(async (supabase) => {
      if (!supabase || !active) return
      setClient(supabase)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return
        setSession(nextSession)
        setError(null)
        setIsLoading(false)
      })
      unsubscribe = () => subscription.unsubscribe()
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!active) return
      if (sessionError) setError(`Không thể khôi phục phiên đăng nhập: ${sessionError.message}`)
      setSession(data.session)
      setIsLoading(false)
    }).catch((sessionError: unknown) => {
      if (!active) return
      setError(`Không thể khởi tạo đăng nhập Supabase: ${describeAuthError(sessionError)}`)
      setIsLoading(false)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (identifier: string, password: string): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Tài khoản chưa được cấu hình hoặc chưa sẵn sàng.' }
    try {
      const email = identifier.includes('@') ? identifier : usernameToAuthEmail(identifier)
      const { error: signInError } = await client.auth.signInWithPassword({ email, password })
      if (signInError) return { ok: false, message: signInError.message }
      return { ok: true, message: 'Đăng nhập thành công.' }
    } catch (signInError: unknown) {
      return { ok: false, message: describeAuthError(signInError) }
    }
  }, [client])

  const signUp = useCallback(async (
    username: string,
    password: string,
    displayName: string,
    islandName: string,
    appearance: 'male' | 'female',
  ): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Tài khoản chưa được cấu hình hoặc chưa sẵn sàng.' }
    if (!isValidUsername(username)) {
      return { ok: false, message: 'Tên đăng nhập cần từ 3 đến 24 ký tự: chữ không dấu, số, gạch dưới hoặc gạch ngang.' }
    }

    try {
      const { data, error: signUpError } = await client.auth.signUp({
        email: usernameToAuthEmail(username),
        password,
        options: { data: { username: username.trim(), display_name: displayName, island_name: islandName, character_appearance: appearance } },
      })
      if (signUpError) return { ok: false, message: signUpError.message }
      return {
        ok: true,
        message: data.session
          ? 'Tài khoản đã được tạo và đăng nhập.'
          : 'Tài khoản đã tạo nhưng chưa đăng nhập. Nếu muốn bỏ qua xác nhận email trong giai đoạn thử nghiệm, hãy tắt Confirm email trong Supabase rồi đăng nhập lại.',
      }
    } catch (signUpError: unknown) {
      return { ok: false, message: describeAuthError(signUpError) }
    }
  }, [client])

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Tài khoản chưa được cấu hình hoặc chưa sẵn sàng.' }
    try {
      const { error: signOutError } = await client.auth.signOut()
      if (signOutError) return { ok: false, message: signOutError.message }
      return { ok: true, message: 'Đã đăng xuất.' }
    } catch (signOutError: unknown) {
      return { ok: false, message: describeAuthError(signOutError) }
    }
  }, [client])

  const value = useMemo(() => ({
    configured: Boolean(browserAuthConfig),
    isLoading,
    session,
    error,
    signIn,
    signUp,
    signOut,
  }), [isLoading, session, error, signIn, signUp, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
