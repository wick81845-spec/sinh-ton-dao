import { describe, expect, it } from 'vitest'
import { initialGameState, newPlayerGameState } from '../../../data/mockGameState'
import { addItems } from '../../inventory/services/inventoryService'
import { completeConstructions, getShelterRestBonusMultiplier, getUpgradeAvailability, startConstruction, upgradeBuilding } from './buildingService'

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

  it('improves rest recovery by shelter level and only applies it on that island', () => {
    const levelOne = {
      ...initialGameState,
      buildings: [{
        id: 'shelter-1',
        definitionId: 'building_shelter',
        islandId: initialGameState.character.currentLocationId,
        level: 1,
        health: 180,
        status: 'completed' as const,
      }],
    }
    expect(getShelterRestBonusMultiplier(initialGameState)).toBe(1)
    expect(getShelterRestBonusMultiplier(levelOne)).toBe(1.25)
    expect(getShelterRestBonusMultiplier({
      ...levelOne,
      buildings: levelOne.buildings.map((building) => ({ ...building, level: 2 })),
    })).toBe(1.4)
    expect(getShelterRestBonusMultiplier({
      ...levelOne,
      buildings: levelOne.buildings.map((building) => ({ ...building, level: 3 })),
    })).toBe(1.55)
    expect(getShelterRestBonusMultiplier({
      ...levelOne,
      buildings: levelOne.buildings.map((building) => ({ ...building, level: 4 })),
    })).toBe(1.7)
    expect(getShelterRestBonusMultiplier({
      ...levelOne,
      character: { ...levelOne.character, currentLocationId: 'island_002' },
    })).toBe(1)
  })

  it('builds a drying rack from early-game materials', () => {
    const state = {
      ...newPlayerGameState,
      inventory: {
        ...newPlayerGameState.inventory,
        slots: [
          ...newPlayerGameState.inventory.slots,
          { itemId: 'item_branch' as const, quantity: 4 },
          { itemId: 'item_plant_fiber' as const, quantity: 3 },
        ],
      },
    }
    expect(startConstruction(state, 'building_drying_rack', 1_000).ok).toBe(true)
  })

  it('gates advanced shelter upgrades by level, technology, and island discovery', () => {
    const shelter = {
      id: 'shelter-1',
      definitionId: 'building_shelter',
      islandId: initialGameState.character.homeIslandId,
      level: 2,
      health: 180,
      status: 'completed' as const,
    }
    const state = { ...initialGameState, buildings: [shelter] }
    expect(getUpgradeAvailability(state, shelter.id)).toContain('cấp 5')

    const levelReady = {
      ...state,
      character: { ...state.character, level: 5 },
    }
    expect(getUpgradeAvailability(levelReady, shelter.id)).toContain('công nghệ')

    const researched = {
      ...levelReady,
      character: {
        ...levelReady.character,
        researchedTechnologyIds: ['tech_island_settlement'],
      },
    }
    expect(getUpgradeAvailability(researched, shelter.id)).toContain('Đảo Rừng Dạt')

    let inventory = researched.inventory
    for (const [itemId, quantity] of [
      ['item_wood_hard', 4],
      ['item_wood_plank', 12],
      ['item_plant_fiber', 8],
    ] as const) {
      const added = addItems(inventory, itemId, quantity)
      if (!added.ok) throw new Error(added.message)
      inventory = added.container
    }
    const ready = {
      ...researched,
      discoveredIslandIds: [...researched.discoveredIslandIds, 'island_002'],
      inventory,
    }
    expect(getUpgradeAvailability(ready, shelter.id)).toBeNull()
    const upgrading = upgradeBuilding(ready, shelter.id, 1_000)
    if (!upgrading.ok) throw new Error(upgrading.message)
    expect(completeConstructions(upgrading.state, 36_000).state.buildings[0])
      .toMatchObject({ level: 3, status: 'completed' })
  })
})
