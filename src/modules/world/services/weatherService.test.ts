import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { weatherChangeIntervalMs, weatherDefinitions, getWeatherForTime } from '../data/weatherDefinitions'
import { advanceWeather, createWeatherState, isValidWeatherState } from './weatherService'

describe('weatherService', () => {
  it('includes the full proposed weather catalog and selects the same weather for a time slot', () => {
    expect(weatherDefinitions).toHaveLength(40)
    expect(getWeatherForTime('island_001', 12_345)).toEqual(getWeatherForTime('island_001', 12_345))
  })

  it('uses weather appropriate to the island climate', () => {
    for (let slot = 0; slot < 100; slot += 1) {
      const tropical = getWeatherForTime('island_001', slot * weatherChangeIntervalMs, 'tropical_island')
      expect(['snowfall', 'blizzard', 'freezing_rain', 'severe_cold', 'volcanic_eruption', 'ashfall'])
        .not.toContain(tropical.id)

      const frozen = getWeatherForTime('frozen-island', slot * weatherChangeIntervalMs, 'frozen_island')
      expect(['heat', 'extreme_heat', 'drought', 'volcanic_eruption', 'ashfall'])
        .not.toContain(frozen.id)
    }
  })

  it('advances weather after its local interval and changes with the player location', () => {
    const now = 15 * weatherChangeIntervalMs
    const weather = createWeatherState('island_001', now)
    const state = { ...initialGameState, weather }

    expect(advanceWeather(state, now + 1)).toMatchObject({ state, changed: false })
    const advanced = advanceWeather(state, weather.changesAt)
    expect(advanced.state.weather?.changedAt).toBe(weather.changesAt)

    const moved = advanceWeather({
      ...state,
      character: { ...state.character, currentLocationId: 'island_002' },
    }, now + 1)
    expect(moved.state.weather?.locationId).toBe('island_002')
  })

  it('validates weather save data and rejects unknown weather identifiers', () => {
    expect(isValidWeatherState(createWeatherState('island_001', 1))).toBe(true)
    expect(isValidWeatherState({
      ...createWeatherState('island_001', 1),
      weatherId: 'unknown-weather',
    })).toBe(false)
  })

  it('holds a server-selected global weather until the override is cleared', () => {
    const now = 15 * weatherChangeIntervalMs
    const globalWeather = createWeatherState('island_001', now, 'thunderstorm')
    const state = { ...initialGameState, weather: globalWeather }

    expect(globalWeather.globalOverride).toBe(true)
    expect(advanceWeather(state, globalWeather.changesAt - 1, 'thunderstorm')).toEqual({
      state,
      changed: false,
    })

    const released = advanceWeather(state, now + 1, null)
    expect(released.state.weather?.globalOverride).toBeUndefined()
    expect(released.changed).toBe(true)
  })
})
