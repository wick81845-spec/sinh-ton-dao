import { createClient } from '@supabase/supabase-js'
import { initialGameState } from '../../src/data/mockGameState.js'
import { isValidGameSnapshot } from '../../src/services/persistence/gameSaveService.js'
import type { GameSnapshot } from '../../src/shared/types/game.js'
import type { ApiConfig } from '../config.js'
import type { Database } from '../database.types.js'

export interface PlayerGameState {
  state: GameSnapshot
  revision: number
  created: boolean
}

export interface GameStateService {
  getOrCreate(playerId: string, displayName: string, islandName: string): Promise<PlayerGameState>
  save(
    playerId: string,
    displayName: string,
    islandName: string,
    state: GameSnapshot,
    expectedRevision: number,
  ): Promise<PlayerGameState>
}

export class GameStateConflictError extends Error {
  constructor() {
    super('Tiến trình đã được thay đổi trên thiết bị khác. Hãy tải lại game trước khi tiếp tục.')
    this.name = 'GameStateConflictError'
  }
}

export function createSupabaseGameStateService(config: ApiConfig): GameStateService | null {
  if (!config.supabaseSecretKey) return null

  const adminClient = createClient<Database>(config.supabaseUrl, config.supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  return {
    async getOrCreate(playerId, displayName, islandName): Promise<PlayerGameState> {
      const { data: existingState, error: loadError } = await adminClient
        .from('player_game_states')
        .select('schema_version, revision, state')
        .eq('player_id', playerId)
        .maybeSingle()
      if (loadError) throw loadError

      if (existingState) {
        const parsedState = parsePlayerGameState(existingState)
        parsedState.state.character.name = displayName
        parsedState.state.character.homeIslandName = islandName
        return { ...parsedState, created: false }
      }

      const state = structuredClone(initialGameState)
      const now = new Date().toISOString()
      state.character.id = playerId
      state.character.name = displayName
      state.character.homeIslandName = islandName
      state.character.createdAt = now
      state.character.updatedAt = now
      state.inventory.ownerId = playerId
      if (!isValidGameSnapshot(state)) throw new Error('Dữ liệu ban đầu của người chơi không hợp lệ.')

      const { data: insertedState, error: insertError } = await adminClient
        .from('player_game_states')
        .upsert({
          player_id: playerId,
          schema_version: 5,
          revision: 0,
          state,
        }, { onConflict: 'player_id', ignoreDuplicates: true })
        .select('player_id')
        .maybeSingle()
      if (insertError) throw insertError

      const { data: createdState, error: reloadError } = await adminClient
        .from('player_game_states')
        .select('schema_version, revision, state')
        .eq('player_id', playerId)
        .single()
      if (reloadError) throw reloadError
      return { ...parsePlayerGameState(createdState), created: insertedState !== null }
    },
    async save(playerId, displayName, islandName, snapshot, expectedRevision) {
      const state = structuredClone(snapshot)
      state.character.id = playerId
      state.character.name = displayName
      state.character.homeIslandName = islandName
      state.inventory.ownerId = playerId

      const { data, error } = await adminClient.rpc('save_player_game_state', {
        p_player_id: playerId,
        p_expected_revision: expectedRevision,
        p_state: state,
      })
      if (error?.code === 'P0001') throw new GameStateConflictError()
      if (error) throw error
      const savedState = data?.[0]
      if (!savedState) throw new Error('Máy chủ không trả lại tiến trình vừa lưu.')
      return { ...parsePlayerGameState(savedState), created: false }
    },
  }
}

function parsePlayerGameState(value: {
  schema_version: number
  revision: number
  state: GameSnapshot
}): Omit<PlayerGameState, 'created'> {
  if (value.schema_version !== 5
    || !Number.isSafeInteger(value.revision)
    || value.revision < 0
    || !isValidGameSnapshot(value.state)) {
    throw new Error('Dữ liệu game trên máy chủ không hợp lệ hoặc cần migration.')
  }
  return { state: value.state, revision: value.revision }
}
