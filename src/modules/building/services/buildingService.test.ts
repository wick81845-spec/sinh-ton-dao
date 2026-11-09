import { describe, expect, it } from 'vitest'
import { initialGameState, newPlayerGameState } from '../../../data/mockGameState'
import { completeConstructions, getUpgradeAvailability, startConstruction, upgradeBuilding } from './buildingService'

function stateWithWorkbenchMaterials() {
  return {
    ...initialGameState,
    inventory: {
      ...initialGameState.inventory,
      slots: [
        ...initialGameState.inventory.slots.filter((slot) => slot.itemId !== 'item_wood' && slot.itemId !== 'item_stone'),
        { itemId: 'item_wood' as const, quantity: 12 },
        { itemId: 'item_stone' as const, quantity: 8 },
      ],
    },
  }
}

describe('buildingService', () => {
  it('consumes construction materials once and completes the building after its timer', () => {
    const started = startConstruction(stateWithWorkbenchMaterials(), 'building_workbench', 1_000)
    if (!started.ok) throw new Error(started.message)

    expect(started.state.inventory.slots).toContainEqual({ itemId: 'item_wood', quantity: 4 })
    expect(started.state.inventory.slots).toContainEqual({ itemId: 'item_stone', quantity: 5 })
    expect(started.state.buildings[0].status).toBe('building')

    const completed = completeConstructions(started.state, 6_999)
    expect(completed.completedBuildingIds).toHaveLength(0)
    const result = completeConstructions(started.state, 7_000)
    expect(result.completedBuildingIds).toEqual([started.state.buildings[0].id])
    expect(result.state.buildings[0]).toMatchObject({ status: 'completed', level: 1 })
  })

  it('validates upgrades and applies the next level when construction completes', () => {
    const started = startConstruction(stateWithWorkbenchMaterials(), 'building_workbench', 1_000)
    if (!started.ok) throw new Error(started.message)
    const built = completeConstructions(started.state, 7_000).state
    const buildingId = built.buildings[0].id

    expect(getUpgradeAvailability(built, buildingId)).toBeNull()
    const upgrading = upgradeBuilding(built, buildingId, 8_000)
    if (!upgrading.ok) throw new Error(upgrading.message)
    expect(upgrading.state.buildings[0].status).toBe('building')
    expect(completeConstructions(upgrading.state, 15_999).state.buildings[0].level).toBe(1)
    expect(completeConstructions(upgrading.state, 16_000).state.buildings[0]).toMatchObject({
      level: 2,
      status: 'completed',
    })
  })

  it('lets new survivors build a campfire and a leaf shelter from the crash supplies', () => {
    const campfire = startConstruction(newPlayerGameState, 'building_campfire', 1_000)
    expect(campfire.ok).toBe(true)
    const shelter = startConstruction(newPlayerGameState, 'building_shelter', 1_000)
    expect(shelter.ok).toBe(true)
  })
})
