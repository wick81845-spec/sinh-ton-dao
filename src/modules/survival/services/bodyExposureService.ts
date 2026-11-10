import type { GameSnapshot } from '../../../shared/types/game'
import type { WeatherDefinition } from '../../world/data/weatherDefinitions'
import { getSurvivalConditions } from '../utils/survivalCalculator'

const millisecondsPerMinute = 60_000
const campfireWarmthPerMinute = 0.12
const activeCampfireWarmthPerMinute = 0.6
const rainRatesPerMinute: Readonly<Record<string, number>> = {
  drizzle: 0.3,
  moderate_rain: 0.6,
  heavy_rain: 1.1,
  tropical_shower: 1,
  thunderstorm: 1.25,
  lightning_storm: 1.25,
  hail: 0.75,
  freezing_rain: 0.9,
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function advanceBodyExposure(
  state: GameSnapshot,
  elapsedMilliseconds: number,
  weather?: WeatherDefinition,
  isSheltered = false,
  isNearCampfire = false,
  isActivelyWarming = false,
): { state: GameSnapshot; changed: boolean } {
  const elapsedMinutes = Math.max(0, elapsedMilliseconds) / millisecondsPerMinute
  if (elapsedMinutes === 0) return { state, changed: false }

  const previousWetness = state.survival.wetness ?? 0
  const previousBodyTemperature = state.survival.bodyTemperature ?? 37
  const rainRate = weather ? rainRatesPerMinute[weather.id] ?? 0 : 0
  const shelterRainMultiplier = isSheltered ? 0.08 : 1
  const dryingRate = weather && weather.temperatureDelta >= 2 ? 0.2 : 0.08
  const wetness = round(clamp(
    previousWetness
      + rainRate * shelterRainMultiplier * elapsedMinutes
      - (rainRate === 0 ? dryingRate * elapsedMinutes : 0),
    0,
    100,
  ))

  const temperatureDelta = weather?.temperatureDelta ?? 0
  const shelterTemperatureMultiplier = isSheltered ? 0.2 : 1
  const ambientShiftPerMinute = temperatureDelta >= 0
    ? temperatureDelta * 0.008
    : temperatureDelta * 0.004
  const wetColdShiftPerMinute = temperatureDelta < 0 ? (wetness / 100) * 0.03 : 0
  const campfireWarmth = isNearCampfire
    ? Math.min(
      Math.max(0, 37 - previousBodyTemperature),
      (isActivelyWarming ? activeCampfireWarmthPerMinute : campfireWarmthPerMinute) * elapsedMinutes,
    )
    : 0
  const bodyTemperature = round(clamp(
    previousBodyTemperature
      + (ambientShiftPerMinute - wetColdShiftPerMinute)
        * shelterTemperatureMultiplier
        * elapsedMinutes
      + campfireWarmth,
    32,
    42,
  ))
  const changed = wetness !== previousWetness || bodyTemperature !== previousBodyTemperature
  if (!changed) return { state, changed: false }

  const survival = { ...state.survival, wetness, bodyTemperature }
  return {
    state: {
      ...state,
      ...(isActivelyWarming && bodyTemperature >= 37 ? { isWarmingAtCampfire: false } : {}),
      survival: { ...survival, conditions: getSurvivalConditions(survival) },
    },
    changed: true,
  }
}
