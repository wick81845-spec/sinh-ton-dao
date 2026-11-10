import { createClient } from '@supabase/supabase-js'
import type {
  AdminPlayerSummary,
  AdminPlayerSurvivalSummary,
  AdminSurvivalCommand,
  GlobalGameSettings,
  PendingAdminCommand,
} from '../../src/shared/types/admin.js'
import { parseAdminSurvivalCommand } from './adminSurvivalCommand.js'
import { isValidGameSnapshot } from '../../src/services/persistence/gameSaveService.js'
import type { ApiConfig } from '../config.js'
import type { Database, Json } from '../database.types.js'

export interface AdminControlService {
  listPlayers(): Promise<AdminPlayerSummary[]>
  getPlayerSurvival(playerId: string): Promise<AdminPlayerSurvivalSummary | null>
  playerExists(playerId: string): Promise<boolean>
  getGlobalSettings(): Promise<GlobalGameSettings>
  setGlobalWeather(weatherId: string | null, adminId: string): Promise<GlobalGameSettings>
  createSurvivalCommand(
    playerId: string,
    adminId: string,
    command: AdminSurvivalCommand,
  ): Promise<string>
  getPendingCommands(playerId: string): Promise<PendingAdminCommand[]>
  acknowledgeCommand(playerId: string, commandId: string): Promise<void>
}

export function createSupabaseAdminControlService(config: ApiConfig): AdminControlService | null {
  if (!config.supabaseSecretKey) return null

  const adminClient = createClient<Database>(config.supabaseUrl, config.supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  return {
    async listPlayers() {
      const { data, error } = await adminClient
        .from('player_profiles')
        .select('id, username, display_name')
        .order('username')
      if (error) throw error
      return data.map((player) => ({
        id: player.id,
        username: player.username,
        displayName: player.display_name,
      }))
    },

    async playerExists(playerId) {
      const { data, error } = await adminClient
        .from('player_profiles')
        .select('id')
        .eq('id', playerId)
        .maybeSingle()
      if (error) throw error
      return data !== null
    },

    async getPlayerSurvival(playerId) {
      const { data, error } = await adminClient
        .from('player_game_states')
        .select('schema_version, state')
        .eq('player_id', playerId)
        .maybeSingle()
      if (error) throw error
      if (!data || data.schema_version !== 5) return null
      if (!isValidGameSnapshot(data.state)) {
        throw new Error(`Save của người chơi ${playerId} không hợp lệ.`)
      }
      const { survival, ailments = [], character } = data.state
      return {
        survival,
        ailments,
        status: character.status,
        currentLocationId: character.currentLocationId,
      }
    },

    async getGlobalSettings() {
      const { data, error } = await adminClient
        .from('global_game_settings')
        .select('global_weather_id, updated_at')
        .eq('id', true)
        .single()
      if (error) throw error
      return { weatherId: data.global_weather_id, updatedAt: data.updated_at }
    },

    async setGlobalWeather(weatherId, adminId) {
      const { data, error } = await adminClient
        .from('global_game_settings')
        .upsert({
          id: true,
          global_weather_id: weatherId,
          updated_by: adminId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select('global_weather_id, updated_at')
        .single()
      if (error) throw error
      return { weatherId: data.global_weather_id, updatedAt: data.updated_at }
    },

    async createSurvivalCommand(playerId, adminId, command) {
      const { data, error } = await adminClient
        .from('game_admin_commands')
        .insert({
          player_id: playerId,
          created_by: adminId,
          command: toJson(command),
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },

    async getPendingCommands(playerId) {
      const { data, error } = await adminClient
        .from('game_admin_commands')
        .select('id, command')
        .eq('player_id', playerId)
        .is('applied_at', null)
        .order('created_at')
        .limit(20)
      if (error) throw error
      return data.map((entry) => {
        const command = parseAdminSurvivalCommand(entry.command)
        if (!command) throw new Error(`Lệnh quản trị ${entry.id} bị hỏng hoặc không hợp lệ.`)
        return { id: entry.id, command }
      })
    },

    async acknowledgeCommand(playerId, commandId) {
      const { error } = await adminClient
        .from('game_admin_commands')
        .update({ applied_at: new Date().toISOString() })
        .eq('id', commandId)
        .eq('player_id', playerId)
        .is('applied_at', null)
      if (error) throw error
    },
  }
}

function toJson(command: AdminSurvivalCommand): Json {
  const json: { [key: string]: Json } = {}
  for (const key of ['health', 'hunger', 'thirst', 'stamina', 'bodyTemperature', 'wetness'] as const) {
    const value = command[key]
    if (value !== undefined) json[key] = value
  }
  if (command.ailments !== undefined) {
    json.ailments = command.ailments.map((ailment) => ({
      id: ailment.id,
      elapsedMs: ailment.elapsedMs,
      ...(ailment.severity ? { severity: ailment.severity } : {}),
    }))
  }
  return json
}
