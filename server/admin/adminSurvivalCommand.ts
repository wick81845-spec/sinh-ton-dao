import type { AdminSurvivalCommand } from '../../src/shared/types/admin.js'
import type { SurvivalAilment, SurvivalAilmentId } from '../../src/shared/types/game.js'

const ailmentIds: readonly string[] = [
  'bleeding', 'infection', 'heatstroke', 'hypothermia', 'poisoning',
  'sunburn', 'sprain', 'fracture', 'blisters', 'insectBites', 'tropicalFever',
  'diarrhea', 'allergy', 'smoke', 'marineSting', 'dehydration', 'burns',
  'frostbite', 'animalBite', 'exhaustion',
]
const editableFields = new Set([
  'health', 'hunger', 'thirst', 'stamina', 'bodyTemperature', 'wetness', 'ailments',
])

export function parseAdminSurvivalCommand(value: unknown): AdminSurvivalCommand | null {
  if (!isRecord(value) || Object.keys(value).some((key) => !editableFields.has(key))) return null

  const command: AdminSurvivalCommand = {}
  for (const [key, min, max] of [
    ['health', 0, 100],
    ['hunger', 0, 100],
    ['thirst', 0, 100],
    ['stamina', 0, 100],
    ['bodyTemperature', 32, 42],
    ['wetness', 0, 100],
  ] as const) {
    if (!(key in value)) continue
    const field = value[key]
    if (typeof field !== 'number' || !Number.isFinite(field) || field < min || field > max) return null
    switch (key) {
      case 'health': command.health = field; break
      case 'hunger': command.hunger = field; break
      case 'thirst': command.thirst = field; break
      case 'stamina': command.stamina = field; break
      case 'bodyTemperature': command.bodyTemperature = field; break
      case 'wetness': command.wetness = field; break
    }
  }

  if ('ailments' in value) {
    if (!Array.isArray(value.ailments) || value.ailments.length > 20) return null
    const ailments: SurvivalAilment[] = []
    for (const entry of value.ailments) {
      if (!isRecord(entry)
        || !isAilmentId(entry.id)
        || typeof entry.elapsedMs !== 'number'
        || !Number.isFinite(entry.elapsedMs)
        || entry.elapsedMs < 0
        || (entry.severity !== undefined && !isAilmentSeverity(entry.severity))) return null
      ailments.push({
        id: entry.id,
        elapsedMs: entry.elapsedMs,
        ...(isAilmentSeverity(entry.severity) ? { severity: entry.severity } : {}),
      })
    }
    if (new Set(ailments.map((ailment) => ailment.id)).size !== ailments.length) return null
    command.ailments = ailments
  }

  return Object.keys(command).length > 0 ? command : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAilmentId(value: unknown): value is SurvivalAilmentId {
  return typeof value === 'string' && ailmentIds.includes(value)
}

function isAilmentSeverity(value: unknown): value is NonNullable<SurvivalAilment['severity']> {
  return value === 'mild' || value === 'moderate' || value === 'severe'
}
