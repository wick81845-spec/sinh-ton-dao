import { createClient } from '@supabase/supabase-js'
import type { ApiConfig } from '../config.js'
import type { Database } from '../database.types.js'

export interface WorldPlayer {
  id: string
  displayName: string
  islandName: string
  joinedAt: string
}

export interface WorldPresenceService {
  enter(playerId: string): Promise<void>
  leave(playerId: string): Promise<void>
  getOnlinePlayers(): Promise<WorldPlayer[]>
}

export class WorldPresenceError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.name = 'WorldPresenceError'
  }
}

const migrationHint = 'Cần áp dụng migration Supabase global_world_presence để bật thế giới online.'

function throwPresenceError(error: { code?: string; message: string }): never {
  if (error.code === 'P0001') throw new WorldPresenceError('Thế giới đã đủ 20 người chơi online.', 409)
  if (error.code === 'PGRST202' || error.code === '42883' || error.code === '42P01') {
    throw new WorldPresenceError(migrationHint, 503)
  }
  throw new Error(`Không thể cập nhật hiện diện thế giới: ${error.message}`)
}

export function createSupabaseWorldPresenceService(config: ApiConfig): WorldPresenceService | null {
  if (!config.supabaseSecretKey) return null

  const adminClient = createClient<Database>(config.supabaseUrl, config.supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  return {
    async enter(playerId) {
      const { error } = await adminClient.rpc('enter_global_world', { p_player_id: playerId })
      if (error) throwPresenceError(error)
    },
    async leave(playerId) {
      const { error } = await adminClient.rpc('leave_global_world', { p_player_id: playerId })
      if (error) throwPresenceError(error)
    },
    async getOnlinePlayers() {
      const cutoff = new Date(Date.now() - 60_000).toISOString()
      const { data: presences, error: presenceError } = await adminClient
        .from('world_online_players')
        .select('player_id, joined_at')
        .gte('last_seen_at', cutoff)
        .order('joined_at', { ascending: true })
      if (presenceError) throwPresenceError(presenceError)
      if (presences.length === 0) return []

      const { data: profiles, error: profileError } = await adminClient
        .from('player_profiles')
        .select('id, display_name, island_name')
        .in('id', presences.map((presence) => presence.player_id))
      if (profileError) throw profileError

      const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
      return presences.flatMap((presence) => {
        const profile = profilesById.get(presence.player_id)
        return profile
          ? [{ id: profile.id, displayName: profile.display_name, islandName: profile.island_name, joinedAt: presence.joined_at }]
          : []
      })
    },
  }
}
