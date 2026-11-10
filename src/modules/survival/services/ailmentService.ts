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

export function inflictCombatWound(state: GameSnapshot): GameSnapshot {
  const ailments = state.ailments ?? []
  if (ailments.some((ailment) => ailment.id === 'bleeding')) return state
  return { ...state, ailments: [...ailments, { id: 'bleeding', elapsedMs: 0 }] }
}

export function inflictPoisoning(state: GameSnapshot): GameSnapshot {
  const ailments = state.ailments ?? []
  if (ailments.some((ailment) => ailment.id === 'poisoning')) return state
  return { ...state, ailments: [...ailments, { id: 'poisoning', elapsedMs: 0 }] }
}

export function advanceAilments(
  state: GameSnapshot,
  elapsedMilliseconds: number,
  weather?: WeatherDefinition,
  isSheltered = false,
): { state: GameSnapshot; changed: boolean } {
  const elapsed = Math.max(0, elapsedMilliseconds)
  const currentAilments = state.ailments ?? []
  const heatExposure = !isSheltered && (weather?.temperatureDelta ?? 0) >= 9
  const coldExposure = !isSheltered && (weather?.temperatureDelta ?? 0) <= -12
  const heatstroke = currentAilments.find((ailment) => ailment.id === 'heatstroke')
  const hypothermia = currentAilments.find((ailment) => ailment.id === 'hypothermia')
  const needsExposureTracking = heatExposure && !heatstroke || coldExposure && !hypothermia
  if (elapsed === 0 || (currentAilments.length === 0 && !needsExposureTracking)) {
    return { state, changed: false }
  }

  let health = state.survival.health
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

  if (bleeding) ailments.unshift(bleeding)
  const roundedHealth = Math.max(0, Math.round(health * 100) / 100)
  const updatedState: GameSnapshot = {
    ...state,
    ailments,
    survival: {
      ...state.survival,
      health: roundedHealth,
      conditions: getSurvivalConditions({ ...state.survival, health: roundedHealth }),
    },
  }
  return {
    state: updatedState,
    changed,
  }
}
