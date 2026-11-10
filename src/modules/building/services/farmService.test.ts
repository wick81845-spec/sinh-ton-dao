import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { harvestCrop, getCropPlantAvailability, plantCrop } from './farmService'

function farmState(seedItemId: 'item_fruit_seed' | 'item_herb_seed' | 'item_coconut_seed' = 'item_fruit_seed') {
  return {
    ...initialGameState,
    character: {
      ...initialGameState.character,
      researchedTechnologyIds: ['tech_agriculture'],
    },
    inventory: {
      ...initialGameState.inventory,
      slots: [{ itemId: seedItemId, quantity: 1 }],
    },
    buildings: [{
      id: 'garden-1',
      definitionId: 'building_garden_bed',
      islandId: initialGameState.character.currentLocationId,
      level: 1,
      health: 90,
      status: 'completed' as const,
    }],
  }
}

describe('farmService', () => {
  it('plants a crop, consumes one seed, and blocks planting another crop in the occupied bed', () => {
    const state = farmState()
    const planted = plantCrop(state, 'garden-1', 'fruit', 1_000)

    expect(planted.ok).toBe(true)
    if (!planted.ok) throw new Error(planted.message)
    expect(planted.state.farmPlots).toEqual([{
      id: 'farm-garden-1-1000',
      buildingId: 'garden-1',
      cropId: 'fruit',
      plantedAt: 1_000,
      readyAt: 301_000,
    }])
    expect(planted.state.inventory.slots).toEqual([])
    expect(getCropPlantAvailability(planted.state, 'garden-1', 'herb')).toBe('Luống này đang có cây trồng.')
  })

  it('waits for crop growth and harvests with inventory freshness', () => {
    const planted = plantCrop(farmState(), 'garden-1', 'fruit', 1_000)
    if (!planted.ok) throw new Error(planted.message)

    expect(harvestCrop(planted.state, 'farm-garden-1-1000', 300_999)).toEqual({
      ok: false,
      message: 'Cây trồng chưa phát triển xong.',
    })
    const harvested = harvestCrop(planted.state, 'farm-garden-1-1000', 301_000)
    expect(harvested.ok).toBe(true)
    if (!harvested.ok) throw new Error(harvested.message)
    expect(harvested.state.inventory.slots).toEqual([
      { itemId: 'item_wild_fruit', quantity: 4, expiresAt: 301_000 + 3 * 60 * 60 * 1000 },
    ])
    expect(harvested.state.farmPlots).toEqual([])
  })

  it('requires an agricultural technology, seed, and completed garden bed', () => {
    const state = farmState()
    expect(getCropPlantAvailability({
      ...state,
      character: { ...state.character, researchedTechnologyIds: [] },
    }, 'garden-1', 'fruit')).toBe('Cần nghiên cứu công nghệ trồng trọt trên đảo.')
    expect(getCropPlantAvailability({
      ...state,
      inventory: { ...state.inventory, slots: [] },
    }, 'garden-1', 'fruit')).toBe('Cần có Hạt giống cây ăn quả.')
    expect(getCropPlantAvailability({
      ...state,
      buildings: state.buildings.map((building) => ({ ...building, status: 'building' as const })),
    }, 'garden-1', 'fruit')).toBe('Cần có luống trồng đã hoàn thành tại đảo hiện tại.')
  })
})
