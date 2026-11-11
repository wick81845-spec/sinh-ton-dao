import type { GameSnapshot, SurvivalAilment } from '../../../shared/types/game'
import { getSurvivalConditions } from '../utils/survivalCalculator'
import type { WeatherDefinition } from '../../world/data/weatherDefinitions'

const bleedingDurationMs = 5 * 60 * 1000
const infectionThresholdMs = 3 * 60 * 1000
const extremeExposureThresholdMs = 10 * 60 * 1000
const poisoningDurationMs = 20 * 60 * 1000
const millisecondsPerHour = 60 * 60 * 1000
const bleedingDamagePerHour = 18
const infectionDamagePerHour = 6
const exposureDamagePerHour = 6
const poisoningDamagePerHour = 12
const generalAilmentDamagePerHour: Partial<Record<SurvivalAilment['id'], number>> = {
  sunburn: 1.5,
  sprain: 0.5,
  fracture: 2,
  blisters: 0.25,
  insectBites: 0.5,
  tropicalFever: 4,
  diarrhea: 3,
  allergy: 1,
  smoke: 2,
  marineSting: 3,
  burns: 3,
  frostbite: 3,
  animalBite: 4,
}
const generalAilmentStaminaPerHour: Partial<Record<SurvivalAilment['id'], number>> = {
  sunburn: 1.5,
  sprain: 4,
  fracture: 6,
  blisters: 2,
  insectBites: 1,
  tropicalFever: 3,
  diarrhea: 4,
  allergy: 2,
  smoke: 4,
  marineSting: 3,
  burns: 2,
  frostbite: 3,
  animalBite: 3,
}

export function inflictCombatWound(state: GameSnapshot): GameSnapshot {
  return inflictSurvivalAilment(state, 'bleeding')
}

export function inflictPoisoning(state: GameSnapshot): GameSnapshot {
  return inflictSurvivalAilment(state, 'poisoning')
}

export function inflictSurvivalAilment(
  state: GameSnapshot,
  id: SurvivalAilment['id'],
  severity?: SurvivalAilment['severity'],
): GameSnapshot {
  const ailments = state.ailments ?? []
  if (ailments.some((ailment) => ailment.id === id)) return state
  if (ailments.length >= 20) return state
  return {
    ...state,
    ailments: [...ailments, { id, elapsedMs: 0, ...(severity ? { severity } : {}) }],
  }
}

export function advanceAilments(
  state: GameSnapshot,
  elapsedMilliseconds: number,
  weather?: WeatherDefinition,
  isSheltered = false,
  isNearCampfire = false,
): { state: GameSnapshot; changed: boolean } {
  const elapsed = Math.max(0, elapsedMilliseconds)
  const currentAilments = state.ailments ?? []
  const wetness = state.survival.wetness ?? 0
  const bodyTemperature = state.survival.bodyTemperature ?? 37
  const heatExposure = !isSheltered && bodyTemperature >= 39
  const coldExposure = !isSheltered && !isNearCampfire
    && bodyTemperature <= 35
  const heatstroke = currentAilments.find((ailment) => ailment.id === 'heatstroke')
  const hypothermia = currentAilments.find((ailment) => ailment.id === 'hypothermia')
  const generalExposureRules = [
    { id: 'sunburn', exposed: !isSheltered && (weather?.temperatureDelta ?? 0) >= 9 },
    { id: 'frostbite', exposed: !isSheltered && wetness >= 70 && bodyTemperature <= 35 },
  ] as const
  const needsExposureTracking = (heatExposure && !heatstroke)
    || (coldExposure && !hypothermia)
    || generalExposureRules.some((rule) => rule.exposed
      && !currentAilments.some((ailment) => ailment.id === rule.id))
  if (elapsed === 0 || (currentAilments.length === 0 && !needsExposureTracking)) {
    return { state, changed: false }
  }

  let health = state.survival.health
  let stamina = state.survival.stamina
  let changed = false
  let bleeding: SurvivalAilment | undefined
  const ailments: SurvivalAilment[] = []
  const trackedExposureIds = new Set<string>()

  for (const ailment of currentAilments) {
    if (ailment.id === 'bleeding') {
      const activeDuration = Math.min(elapsed, Math.max(0, bleedingDurationMs - ailment.elapsedMs))
      health -= activeDuration / millisecondsPerHour * bleedingDamagePerHour
      const elapsedMs = ailment.elapsedMs + elapsed
      if (elapsedMs < bleedingDurationMs) bleeding = { id: 'bleeding', elapsedMs }
      else changed = true
      if (elapsedMs >= infectionThresholdMs
        && !currentAilments.some((entry) => entry.id === 'infection')) {
        const infectionElapsedMs = Math.max(0, elapsedMs - infectionThresholdMs)
        const infectionActiveDuration = Math.max(
          0,
          elapsedMs - Math.max(ailment.elapsedMs, infectionThresholdMs),
        )
        health -= infectionActiveDuration / millisecondsPerHour * infectionDamagePerHour
        ailments.push({ id: 'infection', elapsedMs: infectionElapsedMs })
        changed = true
      }
      continue
    }

    if (ailment.id === 'infection') {
      health -= elapsed / millisecondsPerHour * infectionDamagePerHour
      ailments.push({ ...ailment, elapsedMs: ailment.elapsedMs + elapsed })
      continue
    }

    if (ailment.id === 'poisoning') {
      const activeDuration = Math.min(elapsed, Math.max(0, poisoningDurationMs - ailment.elapsedMs))
      health -= activeDuration / millisecondsPerHour * poisoningDamagePerHour
      const elapsedMs = ailment.elapsedMs + elapsed
      if (elapsedMs < poisoningDurationMs) ailments.push({ ...ailment, elapsedMs })
      else changed = true
      continue
    }

    if (ailment.id !== 'heatstroke' && ailment.id !== 'hypothermia') {
      if (ailment.id === 'exhaustion') {
        changed = true
        continue
      }
      if (ailment.id === 'dehydration' && state.survival.thirst >= 50) {
        changed = true
        continue
      }
      if (ailment.id === 'dehydration') {
        ailments.push({ ...ailment, elapsedMs: ailment.elapsedMs + elapsed })
        continue
      }
      const noLongerExposed = ailment.id === 'sunburn'
        ? isSheltered || (weather?.temperatureDelta ?? 0) < 9
        : ailment.id === 'frostbite'
          ? isSheltered || bodyTemperature >= 36
          : false
      if (noLongerExposed) {
        const elapsedMs = Math.max(0, ailment.elapsedMs - elapsed * 2)
        if (elapsedMs === 0) {
          changed = true
        } else {
          ailments.push({ ...ailment, elapsedMs })
        }
        continue
      }
      const severityMultiplier = ailment.severity === 'severe' ? 2 : ailment.severity === 'moderate' ? 1.5 : 1
      health -= elapsed / millisecondsPerHour
        * (generalAilmentDamagePerHour[ailment.id] ?? 0)
        * severityMultiplier
      stamina -= elapsed / millisecondsPerHour
        * (generalAilmentStaminaPerHour[ailment.id] ?? 0)
        * severityMultiplier
      const elapsedMs = ailment.elapsedMs + elapsed
      const severity = elapsedMs >= 30 * 60 * 1000
        ? 'severe'
        : elapsedMs >= 10 * 60 * 1000
          ? 'moderate'
          : 'mild'
      if (severity !== ailment.severity) changed = true
      ailments.push({ ...ailment, elapsedMs, severity })
      continue
    }

    const isHeatstroke = ailment.id === 'heatstroke'
    const isExposed = isHeatstroke ? heatExposure : coldExposure
    trackedExposureIds.add(ailment.id)
    const nextElapsedMs = Math.max(0, ailment.elapsedMs + (isExposed ? elapsed : -elapsed * 2))
    if (isExposed) {
      const activeDuration = Math.max(
        0,
        nextElapsedMs - Math.max(ailment.elapsedMs, extremeExposureThresholdMs),
      )
      health -= activeDuration / millisecondsPerHour * exposureDamagePerHour
    }
    if (nextElapsedMs === 0) {
      changed = true
    } else {
      if ((ailment.elapsedMs < extremeExposureThresholdMs) !== (nextElapsedMs < extremeExposureThresholdMs)) {
        changed = true
      }
      ailments.push({ ...ailment, elapsedMs: nextElapsedMs })
    }
  }

  for (const [id, exposed, existing] of [
    ['heatstroke', heatExposure, heatstroke],
    ['hypothermia', coldExposure, hypothermia],
  ] as const) {
    if (!exposed || existing || trackedExposureIds.has(id)) continue
    const elapsedMs = elapsed
    if (elapsedMs >= extremeExposureThresholdMs) changed = true
    const activeDuration = Math.max(0, elapsedMs - extremeExposureThresholdMs)
    health -= activeDuration / millisecondsPerHour * exposureDamagePerHour
    ailments.push({ id, elapsedMs })
  }

  for (const rule of generalExposureRules) {
    if (!rule.exposed
      || currentAilments.some((ailment) => ailment.id === rule.id)
      || ailments.some((ailment) => ailment.id === rule.id)
      || ailments.length >= 20) continue
    ailments.push({ id: rule.id, elapsedMs: 0, severity: 'mild' })
    changed = true
  }

  if (bleeding) ailments.unshift(bleeding)
  const roundedHealth = Math.max(0, Math.round(health * 100) / 100)
  const roundedStamina = Math.max(0, Math.round(stamina * 100) / 100)
  const updatedState: GameSnapshot = {
    ...state,
    ailments,
    survival: {
      ...state.survival,
      health: roundedHealth,
      stamina: roundedStamina,
      conditions: getSurvivalConditions({ ...state.survival, health: roundedHealth, stamina: roundedStamina }),
    },
  }
  return {
    state: updatedState,
    changed,
  }
}
