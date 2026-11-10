import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { weatherDefinitions } from '../../world/data/weatherDefinitions'
import { advanceRainCollection, collectRainwater } from './waterCollectionService'

const rainyWeather = weatherDefinitions.find((weather) => weather.group === 'rain')
if (!rainyWeather) throw new Error('At least one rain type should be configured.')

function collectorState() {
  return {
    ...initialGameState,
    buildings: [{
      id: 'rain-collector',
      definitionId: 'building_rain_collector',
      islandId: initialGameState.character.currentLocationId,
      level: 1,
      health: 100,
      status: 'completed' as const,
    }],
  }
}

describe('waterCollectionService', () => {
  it('collects rain over time and allows the stored water to be taken', () => {
    const state = collectorState()
    const first = advanceRainCollection(state, 30_000, rainyWeather)
    const second = advanceRainCollection(first.state, 30_000, rainyWeather)

    expect(second.state.waterCollectors?.['rain-collector']).toEqual({ storedUnits: 1, progressMs: 0 })
    expect(second.changed).toBe(true)
    const collected = collectRainwater(second.state, 'rain-collector')
    expect(collected.ok).toBe(true)
    if (!collected.ok) throw new Error(collected.message)
    expect(collected.state.inventory.slots).toContainEqual({ itemId: 'item_fresh_water', quantity: 1 })
    expect(collected.state.waterCollectors?.['rain-collector']?.storedUnits).toBe(0)
  })

  it('does not collect water outside rainy weather or beyond container capacity', () => {
    const state = collectorState()
    expect(advanceRainCollection(state, 60_000, weatherDefinitions[0]).state).toBe(state)
    const fullState = {
      ...state,
      waterCollectors: { 'rain-collector': { storedUnits: 10, progressMs: 0 } },
    }
    expect(advanceRainCollection(fullState, 60_000, rainyWeather)).toEqual({
      state: fullState,
      changed: false,
    })
  })

  it('preserves stored water when inventory has no room', () => {
    const state = {
      ...collectorState(),
      inventory: { ...initialGameState.inventory, maxSlots: initialGameState.inventory.slots.length },
      waterCollectors: { 'rain-collector': { storedUnits: 1, progressMs: 0 } },
    }
    expect(collectRainwater(state, 'rain-collector')).toEqual({
      ok: false,
      message: 'Túi đồ không đủ chỗ để lấy nước mưa.',
    })
  })
})
