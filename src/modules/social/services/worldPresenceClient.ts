export interface WorldPlayerView {
  id: string
  displayName: string
  islandName: string
  joinedAt: string
}

interface WorldPresenceResponse {
  players: WorldPlayerView[]
  maxPlayers: number
}

const apiUrl = import.meta.env.VITE_API_URL?.trim()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseWorldPresence(value: unknown): WorldPresenceResponse {
  if (!isRecord(value)
    || !Array.isArray(value.players)
    || !Number.isInteger(value.maxPlayers)
    || value.maxPlayers !== 20) {
    throw new Error('Máy chủ trả về trạng thái thế giới không hợp lệ.')
  }
  const players = value.players.map((player): WorldPlayerView => {
    if (!isRecord(player)
      || typeof player.id !== 'string'
      || typeof player.displayName !== 'string'
      || typeof player.islandName !== 'string'
      || typeof player.joinedAt !== 'string') {
      throw new Error('Máy chủ trả về hồ sơ người chơi không hợp lệ.')
    }
    return {
      id: player.id,
      displayName: player.displayName,
      islandName: player.islandName,
      joinedAt: player.joinedAt,
    }
  })
  return { players, maxPlayers: 20 }
}

function parseActionResult(value: unknown): { ok: true; maxPlayers: number } {
  if (!isRecord(value) || value.ok !== true || value.maxPlayers !== 20) {
    throw new Error('Máy chủ xác nhận heartbeat không hợp lệ.')
  }
  return { ok: true, maxPlayers: 20 }
}

async function request(token: string, path: string, method = 'GET'): Promise<unknown> {
  if (!apiUrl) throw new Error('Chưa cấu hình VITE_API_URL để kết nối thế giới online.')
  const response = await fetch(new URL(path, apiUrl), {
    method,
    headers: { authorization: `Bearer ${token}` },
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
      ? body.message
      : `Không thể kết nối thế giới online (HTTP ${response.status}).`
    throw new Error(message)
  }
  return body
}

export async function enterGlobalWorld(token: string): Promise<WorldPresenceResponse> {
  return parseWorldPresence(await request(token, '/api/v1/world/enter', 'POST'))
}

export async function heartbeatGlobalWorld(token: string): Promise<{ ok: true; maxPlayers: number }> {
  return parseActionResult(await request(token, '/api/v1/world/heartbeat', 'POST'))
}

export async function fetchOnlineWorldPlayers(token: string): Promise<WorldPresenceResponse> {
  return parseWorldPresence(await request(token, '/api/v1/world/players'))
}

export async function leaveGlobalWorld(token: string): Promise<{ ok: true }> {
  const result = await request(token, '/api/v1/world/leave', 'DELETE')
  if (!isRecord(result) || result.ok !== true) throw new Error('Máy chủ xác nhận rời thế giới không hợp lệ.')
  return { ok: true }
}
