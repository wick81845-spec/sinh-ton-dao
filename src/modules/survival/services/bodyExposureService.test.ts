import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { getWeatherDefinition } from '../../world/data/weatherDefinitions'
import { advanceBodyExposure } from './bodyExposureService'

describe('bodyExposureService', () => {
  it('accumulates rain wetness and lowers body temperature in cold weather', () => {
    const result = advanceBodyExposure(
      initialGameState,
      10 * 60 * 1000,
      getWeatherDefinition('heavy_rain'),
    )

    expect(result.changed).toBe(true)
    expect(result.state.survival.wetness).toBeGreaterThan(0)
    expect(result.state.survival.bodyTemperature).toBeLessThan(37)
  })

  it('reduces rain exposure under shelter and dries clothing in warm weather', () => {
    const sheltered = advanceBodyExposure(
      initialGameState,
      10 * 60 * 1000,
      getWeatherDefinition('heavy_rain'),
      true,
    )
    expect(sheltered.state.survival.wetness).toBeLessThan(1)

    const dampState = {
      ...initialGameState,
      survival: { ...initialGameState.survival, wetness: 50 },
    }
    const drying = advanceBodyExposure(dampState, 10 * 60 * 1000, getWeatherDefinition('sunny'))
    expect(drying.state.survival.wetness).toBeLessThan(50)
  })

  it('warms a cold survivor near a lit campfire', () => {
    const coldState = {
      ...initialGameState,
      survival: { ...initialGameState.survival, bodyTemperature: 34, wetness: 50 },
    }

    const warmed = advanceBodyExposure(coldState, 10 * 60 * 1000, getWeatherDefinition('blizzard'), false, true)

    expect(warmed.state.survival.bodyTemperature).toBeGreaterThan(coldState.survival.bodyTemperature)
    expect(warmed.state.survival.bodyTemperature).toBeLessThanOrEqual(37)
  })

  it('warms faster when the survivor actively chooses to warm by the fire', () => {
    const coldState = {
      ...initialGameState,
      survival: { ...initialGameState.survival, bodyTemperature: 34, wetness: 0 },
      isWarmingAtCampfire: true,
    }
    const warmed = advanceBodyExposure(coldState, 60_000, undefined, false, true, true)

    expect(warmed.state.survival.bodyTemperature).toBe(34.6)
    expect(warmed.state.isWarmingAtCampfire).toBe(true)
    expect(advanceBodyExposure(coldState, 10 * 60_000, undefined, false, true, true)
      .state.isWarmingAtCampfire).toBe(false)
  })

  it('leaves the state untouched when no time has elapsed', () => {
    expect(advanceBodyExposure(initialGameState, 0)).toEqual({
      state: initialGameState,
      changed: false,
    })
  })
})
