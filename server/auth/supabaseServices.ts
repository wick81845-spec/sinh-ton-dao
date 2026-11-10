import { createClient } from '@supabase/supabase-js'
import type { ApiConfig } from '../config.js'
import type { Database } from '../database.types.js'
import type { AuthenticationServices, AuthenticatedUser, PlayerProfile } from './authentication.js'

export function createSupabaseAuthenticationServices(config: ApiConfig): AuthenticationServices {
  const authClient = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  return {
    async verifyAccessToken(accessToken): Promise<AuthenticatedUser | null> {
      const { data, error } = await authClient.auth.getUser(accessToken)
      if (error) {
        if (error.status === 401 || error.status === 403) return null
        throw error
      }
      return { id: data.user.id, email: data.user.email ?? null }
    },

    async getPlayerProfile(userId, accessToken): Promise<PlayerProfile | null> {
      const userClient = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      })
      const { data, error } = await userClient
        .from('player_profiles')
        .select('id, username, display_name, island_name, is_admin, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  }
}
