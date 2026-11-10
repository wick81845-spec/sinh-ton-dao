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

  it('leaves the state untouched when no time has elapsed', () => {
    expect(advanceBodyExposure(initialGameState, 0)).toEqual({
      state: initialGameState,
      changed: false,
    })
  })
})
