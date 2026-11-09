import { isValidGameSnapshot } from './gameSaveService'
import type { GameSnapshot } from '../../shared/types/game'

export interface RemoteGameState {
  state: GameSnapshot
  revision: number
  created: boolean
}

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

export const isRemoteGameSaveConfigured = Boolean(apiUrl)

export async function loadRemoteGameState(accessToken: string): Promise<RemoteGameState> {
  const response = await fetch(`${apiUrl}/api/v1/game/state`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const payload: unknown = await response.json()
  if (!response.ok) throw new Error(readErrorMessage(payload, 'Không thể tải tiến trình từ máy chủ.'))
  if (!isRemoteGameState(payload)) throw new Error('Dữ liệu tiến trình từ máy chủ không hợp lệ.')
  return payload
}

export async function saveRemoteGameState(
  accessToken: string,
  state: GameSnapshot,
  expectedRevision: number,
): Promise<RemoteGameState> {
  const response = await fetch(`${apiUrl}/api/v1/game/state`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ state, expectedRevision }),
  })
  const payload: unknown = await response.json()
  if (!response.ok) throw new Error(readErrorMessage(payload, 'Không thể lưu tiến trình lên máy chủ.'))
  if (!isRemoteGameState(payload)) throw new Error('Máy chủ trả về tiến trình không hợp lệ.')
  return payload
}

function isRemoteGameState(value: unknown): value is RemoteGameState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const state = value as Record<string, unknown>
  return isValidGameSnapshot(state.state)
    && typeof state.revision === 'number'
    && Number.isSafeInteger(state.revision)
    && state.revision >= 0
    && typeof state.created === 'boolean'
}

function readErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === 'object' && value !== null && 'message' in value
    && typeof value.message === 'string') return value.message
  return fallback
}
