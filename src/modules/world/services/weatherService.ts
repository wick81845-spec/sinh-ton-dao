import type { GameSnapshot, WeatherState } from '../../../shared/types/game'
import {
  getWeatherDefinition,
  getWeatherForTime,
  weatherChangeIntervalMs,
} from '../data/weatherDefinitions'
import { getIslandDefinition } from '../data/worldDefinitions'

export function createWeatherState(locationId: string, now: number): WeatherState {
  const island = getIslandDefinition(locationId)
  const weather = getWeatherForTime(locationId, now, island?.biomeId)
  const changedAt = Math.floor(now / weatherChangeIntervalMs) * weatherChangeIntervalMs
  return {
    weatherId: weather.id,
    locationId,
    changedAt,
    changesAt: changedAt + weatherChangeIntervalMs,
  }
}

export function advanceWeather(state: GameSnapshot, now: number): { state: GameSnapshot; changed: boolean } {
  const locationId = state.character.currentLocationId
  const currentWeather = state.weather
  if (currentWeather?.locationId === locationId && now < currentWeather.changesAt) {
    return { state, changed: false }
  }

  const weather = createWeatherState(locationId, now)
  if (currentWeather?.weatherId === weather.weatherId && currentWeather.locationId === locationId) {
    return { state: { ...state, weather }, changed: false }
  }
  return { state: { ...state, weather }, changed: true }
}

export function getCurrentWeather(state: GameSnapshot) {
  return state.weather ? getWeatherDefinition(state.weather.weatherId) : undefined
}

export function isValidWeatherState(value: unknown): value is WeatherState {
  if (typeof value !== 'object' || value === null) return false
  const weather = value as Record<string, unknown>
  return typeof weather.weatherId === 'string'
    && getWeatherDefinition(weather.weatherId) !== undefined
    && typeof weather.locationId === 'string'
    && getIslandDefinition(weather.locationId) !== undefined
    && typeof weather.changedAt === 'number'
    && Number.isFinite(weather.changedAt)
    && typeof weather.changesAt === 'number'
    && Number.isFinite(weather.changesAt)
    && weather.changesAt > weather.changedAt
}
