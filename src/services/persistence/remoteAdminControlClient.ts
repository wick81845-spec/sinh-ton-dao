import type {
  AdminPlayerSummary,
  AdminPlayerSurvivalSummary,
  AdminSurvivalCommand,
  GlobalGameSettings,
  PendingAdminCommand,
} from '../../shared/types/admin'
import type { SurvivalAilmentId } from '../../shared/types/game'
import { weatherDefinitions } from '../../modules/world/data/weatherDefinitions'

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

export async function loadRemoteWorldSettings(accessToken: string): Promise<GlobalGameSettings> {
  const payload = await request('/api/v1/game/world-settings', accessToken)
  if (!isRecord(payload)
    || !isWeatherId(payload.weatherId)
    || !(payload.updatedAt === null || typeof payload.updatedAt === 'string')) {
    throw new Error('Cài đặt thế giới từ máy chủ không hợp lệ.')
  }
  return { weatherId: payload.weatherId, updatedAt: payload.updatedAt }
}

export async function loadAdminPlayers(accessToken: string): Promise<AdminPlayerSummary[]> {
  const payload = await request('/api/v1/game/admin/players', accessToken)
  if (!isRecord(payload) || !Array.isArray(payload.players)
    || !payload.players.every(isAdminPlayer)) {
    throw new Error('Danh sách người chơi từ máy chủ không hợp lệ.')
  }
  return payload.players
}

export async function loadAdminPlayerSurvival(
  accessToken: string,
  playerId: string,
): Promise<AdminPlayerSurvivalSummary> {
  const payload = await request(
    `/api/v1/game/admin/players/${encodeURIComponent(playerId)}/survival`,
    accessToken,
  )
  if (!isAdminPlayerSurvivalSummary(payload)) {
    throw new Error('Chỉ số sinh tồn người chơi từ máy chủ không hợp lệ.')
  }
  return payload
}

export async function updateGlobalWeather(
  accessToken: string,
  weatherId: string | null,
): Promise<GlobalGameSettings> {
  const payload = await request('/api/v1/game/admin/world-weather', accessToken, {
    method: 'PUT',
    body: JSON.stringify({ weatherId }),
  })
  if (!isRecord(payload)
    || !isWeatherId(payload.weatherId)
    || !(payload.updatedAt === null || typeof payload.updatedAt === 'string')) {
    throw new Error('Máy chủ trả về cài đặt thời tiết không hợp lệ.')
  }
  return { weatherId: payload.weatherId, updatedAt: payload.updatedAt }
}

export async function queueAdminSurvivalCommand(
  accessToken: string,
  playerId: string,
  command: AdminSurvivalCommand,
): Promise<void> {
  const payload = await request(
    `/api/v1/game/admin/players/${encodeURIComponent(playerId)}/survival`,
    accessToken,
    { method: 'POST', body: JSON.stringify(command) },
  )
  if (!isRecord(payload) || typeof payload.id !== 'string' || payload.queued !== true) {
    throw new Error('Máy chủ không xác nhận lệnh sinh tồn.')
  }
}

export async function loadPendingAdminCommands(accessToken: string): Promise<PendingAdminCommand[]> {
  const payload = await request('/api/v1/game/admin/commands/pending', accessToken)
  if (!isRecord(payload) || !Array.isArray(payload.commands)
    || !payload.commands.every(isPendingAdminCommand)) {
    throw new Error('Lệnh quản trị từ máy chủ không hợp lệ.')
  }
  return payload.commands
}

export async function acknowledgeAdminCommand(accessToken: string, commandId: string): Promise<void> {
  const payload = await request(
    `/api/v1/game/admin/commands/${encodeURIComponent(commandId)}/ack`,
    accessToken,
    { method: 'POST' },
  )
  if (!isRecord(payload) || payload.ok !== true) {
    throw new Error('Máy chủ không xác nhận đã áp dụng lệnh quản trị.')
  }
}

async function request(
  path: string,
  accessToken: string,
  options: { method?: string; body?: string } = {},
): Promise<unknown> {
  if (!apiUrl) throw new Error('Cần cấu hình VITE_API_URL để dùng công cụ quản trị online.')
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
    ...(options.body ? { body: options.body } : {}),
  })
  const payload: unknown = await response.json()
  if (!response.ok) throw new Error(readErrorMessage(payload, 'Không thể hoàn tất yêu cầu quản trị.'))
  return payload
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAdminPlayer(value: unknown): value is AdminPlayerSummary {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.username === 'string'
    && typeof value.displayName === 'string'
}

function isWeatherId(value: unknown): value is string | null {
  return value === null
    || (typeof value === 'string' && weatherDefinitions.some((weather) => weather.id === value))
}

function isWithinRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function isAdminPlayerSurvivalSummary(value: unknown): value is AdminPlayerSurvivalSummary {
  if (!isRecord(value) || !isRecord(value.survival) || !Array.isArray(value.ailments)
    || (value.status !== 'alive' && value.status !== 'dead')
    || typeof value.currentLocationId !== 'string') return false
  const survival = value.survival
  return isWithinRange(survival.health, 0, 100)
    && isWithinRange(survival.hunger, 0, 100)
    && isWithinRange(survival.thirst, 0, 100)
    && isWithinRange(survival.stamina, 0, 100)
    && (survival.temperature === undefined || isWithinRange(survival.temperature, -100, 100))
    && (survival.bodyTemperature === undefined || isWithinRange(survival.bodyTemperature, 0, 100))
    && (survival.wetness === undefined || isWithinRange(survival.wetness, 0, 100))
    && Array.isArray(survival.conditions)
    && survival.conditions.every((condition) => typeof condition === 'string')
    && value.ailments.every((ailment) => (
      isRecord(ailment)
      && typeof ailment.id === 'string'
      && isWithinRange(ailment.elapsedMs, 0, Number.MAX_SAFE_INTEGER)
    ))
}

const ailmentIds: readonly string[] = [
  'bleeding', 'infection', 'heatstroke', 'hypothermia', 'poisoning',
  'sunburn', 'sprain', 'fracture', 'blisters', 'insectBites', 'tropicalFever',
  'diarrhea', 'allergy', 'smoke', 'marineSting', 'dehydration', 'burns',
  'frostbite', 'animalBite', 'exhaustion',
]

function isPendingAdminCommand(value: unknown): value is PendingAdminCommand {
  if (!isRecord(value) || typeof value.id !== 'string' || !isRecord(value.command)) return false
  const command = value.command
  const numericFields = ['health', 'hunger', 'thirst', 'stamina', 'bodyTemperature', 'wetness']
  if (Object.entries(command).some(([key, field]) => (
    numericFields.includes(key) ? typeof field !== 'number' || !Number.isFinite(field)
      : key !== 'ailments'
  ))) return false
  if (command.ailments !== undefined && (!Array.isArray(command.ailments)
    || command.ailments.length > 20
    || !command.ailments.every((ailment) => (
      isRecord(ailment)
      && typeof ailment.id === 'string'
      && ailmentIds.includes(ailment.id)
      && typeof ailment.elapsedMs === 'number'
      && Number.isFinite(ailment.elapsedMs)
      && ailment.elapsedMs >= 0
      && (ailment.severity === undefined
        || ailment.severity === 'mild'
        || ailment.severity === 'moderate'
        || ailment.severity === 'severe')
    )))) return false
  return true
}

function readErrorMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.message === 'string' ? value.message : fallback
}

export function isSurvivalAilmentId(value: string): value is SurvivalAilmentId {
  return ailmentIds.includes(value)
}
