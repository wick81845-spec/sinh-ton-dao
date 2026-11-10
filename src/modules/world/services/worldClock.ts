export const worldDayDurationMs = 30 * 60 * 1000
export const worldGameTimeScale = 24 * 60 * 60 * 1000 / worldDayDurationMs
export const worldDaysPerSeason = 7
const gameMinutesPerDay = 24 * 60
const gameMillisecondsPerMinute = worldDayDurationMs / gameMinutesPerDay
const seasonsPerYear = 4
const worldDaysPerYear = worldDaysPerSeason * seasonsPerYear

export type WorldTimePhaseId = 'dawn' | 'day' | 'afternoon' | 'sunset' | 'night' | 'pre-dawn'
export type WorldLightLevel = 'day' | 'dusk' | 'night' | 'dawn'

export interface WorldSeason {
  id: 'spring' | 'summer' | 'autumn' | 'winter'
  name: string
  icon: string
  day: number
  temperatureDelta: number
  thirstMultiplier: number
}

export interface WorldClockState {
  time: string
  phaseId: WorldTimePhaseId
  phaseName: string
  icon: string
  lightLevel: WorldLightLevel
  minutesUntilNextPhase: number
  temperatureDelta: number
  season: WorldSeason
}

const phaseBoundaries = [180, 360, 540, 900, 1080, 1260]

function getPhaseId(gameMinute: number): WorldTimePhaseId {
  if (gameMinute >= 360 && gameMinute < 540) return 'dawn'
  if (gameMinute >= 540 && gameMinute < 900) return 'day'
  if (gameMinute >= 900 && gameMinute < 1080) return 'afternoon'
  if (gameMinute >= 1080 && gameMinute < 1260) return 'sunset'
  if (gameMinute >= 1260 || gameMinute < 180) return 'night'
  return 'pre-dawn'
}

const phaseDetails: Readonly<Record<WorldTimePhaseId, { name: string; icon: string }>> = {
  dawn: { name: 'Bình minh', icon: '🌅' },
  day: { name: 'Ban ngày', icon: '☀' },
  afternoon: { name: 'Chiều', icon: '🌤' },
  sunset: { name: 'Hoàng hôn', icon: '🌇' },
  night: { name: 'Ban đêm', icon: '☾' },
  'pre-dawn': { name: 'Rạng sáng', icon: '🌄' },
}

const seasonDetails = [
  { id: 'spring', name: 'Mùa xuân', icon: '🌱', temperatureDelta: 0, thirstMultiplier: 1 },
  { id: 'summer', name: 'Mùa hè', icon: '☀', temperatureDelta: 3, thirstMultiplier: 1.2 },
  { id: 'autumn', name: 'Mùa thu', icon: '🍂', temperatureDelta: -1, thirstMultiplier: 1 },
  { id: 'winter', name: 'Mùa đông', icon: '❄', temperatureDelta: -3, thirstMultiplier: 0.9 },
] as const

export function getWorldSeason(timestamp: number): WorldSeason {
  const dayIndex = Math.floor(timestamp / worldDayDurationMs)
  const dayOfYear = ((dayIndex % worldDaysPerYear) + worldDaysPerYear) % worldDaysPerYear
  const seasonIndex = Math.floor(dayOfYear / worldDaysPerSeason)
  const season = seasonDetails[seasonIndex]
  return {
    ...season,
    day: dayOfYear % worldDaysPerSeason + 1,
  }
}

export function getWorldClock(timestamp: number): WorldClockState {
  const elapsedInDay = ((timestamp % worldDayDurationMs) + worldDayDurationMs) % worldDayDurationMs
  const gameMinute = Math.floor(elapsedInDay / gameMillisecondsPerMinute)
  const gameHour = Math.floor(gameMinute / 60)
  const gameMinuteOfHour = gameMinute % 60
  const phaseId = getPhaseId(gameMinute)
  const nextBoundary = phaseBoundaries.find((boundary) => boundary > gameMinute) ?? gameMinutesPerDay
  const minutesUntilNextPhase = (nextBoundary - gameMinute) * gameMillisecondsPerMinute / 60_000
  const lightLevel: WorldLightLevel = gameMinute >= 360 && gameMinute < 1080
    ? 'day'
    : gameMinute >= 1080 && gameMinute < 1260
      ? 'dusk'
      : gameMinute >= 1260 || gameMinute < 180
        ? 'night'
        : 'dawn'
  const temperatureDelta = gameHour >= 12 && gameHour < 15
    ? 2
    : gameHour >= 9 && gameHour < 18
      ? 1
      : gameHour >= 21 || gameHour < 6
        ? -2
        : 0
  const details = phaseDetails[phaseId]
  const season = getWorldSeason(timestamp)

  return {
    time: `${String(gameHour).padStart(2, '0')}:${String(gameMinuteOfHour).padStart(2, '0')}`,
    phaseId,
    phaseName: details.name,
    icon: details.icon,
    lightLevel,
    minutesUntilNextPhase,
    temperatureDelta: temperatureDelta + season.temperatureDelta,
    season,
  }
}

export function getWorldWeatherAtTime<T extends { temperatureDelta: number }>(
  weather: T | undefined,
  timestamp: number,
): T | undefined {
  if (!weather) return undefined
  return {
    ...weather,
    temperatureDelta: weather.temperatureDelta + getWorldClock(timestamp).temperatureDelta,
  }
}
