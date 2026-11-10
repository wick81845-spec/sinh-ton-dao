export const worldDayDurationMs = 30 * 60 * 1000
const gameMinutesPerDay = 24 * 60
const gameMillisecondsPerMinute = worldDayDurationMs / gameMinutesPerDay

export type WorldTimePhaseId = 'dawn' | 'day' | 'afternoon' | 'sunset' | 'night' | 'pre-dawn'
export type WorldLightLevel = 'day' | 'dusk' | 'night' | 'dawn'

export interface WorldClockState {
  time: string
  phaseId: WorldTimePhaseId
  phaseName: string
  icon: string
  lightLevel: WorldLightLevel
  minutesUntilNextPhase: number
  temperatureDelta: number
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

  return {
    time: `${String(gameHour).padStart(2, '0')}:${String(gameMinuteOfHour).padStart(2, '0')}`,
    phaseId,
    phaseName: details.name,
    icon: details.icon,
    lightLevel,
    minutesUntilNextPhase,
    temperatureDelta,
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
