import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { getGatheringAvailability } from '../../gathering/services/gatheringService'
import { completeShipConstruction, startShipConstruction } from '../../ship/services/shipService'
import { getRecipeAvailability } from '../../crafting/services/craftingService'
import { getShipConstructionAvailability } from '../../ship/services/shipService'
import { addItems } from '../../inventory/services/inventoryService'
import { isValidGameSnapshot } from '../../../services/persistence/gameSaveService'
import { advanceVoyages, getVoyageAvailability, startVoyage } from './voyageService'

describe('voyageService', () => {
  it('requires a discovered destination and a completed ship, then updates location on arrival', () => {
    expect(getVoyageAvailability(initialGameState, 'island_002')).toBe('Bạn chưa phát hiện hòn đảo này.')
    expect(getShipConstructionAvailability(initialGameState, 'ship_raft'))
      .toBe('Cần nghiên cứu Hàng hải ven bờ trước khi đóng thuyền.')
    const construction = startShipConstruction({
      ...initialGameState,
      character: {
        ...initialGameState.character,
        researchedTechnologyIds: ['tech_seafaring'],
      },
      inventory: {
        ...initialGameState.inventory,
        slots: [...initialGameState.inventory.slots, { itemId: 'item_rope' as const, quantity: 3 }],
      },
    }, 'ship_raft', 1_000)
    if (!construction.ok) throw new Error(construction.message)
    expect(construction.state.inventory.slots).toEqual([
      { itemId: 'item_wood', quantity: 2 },
      { itemId: 'item_stone', quantity: 8 },
      { itemId: 'item_wild_fruit', quantity: 5 },
    ])

    const built = completeShipConstruction(construction.state, 11_000)
    expect(built.completedShipId).toBe('player-ship_raft-1000')
    const ready = {
      ...built.state,
      discoveredIslandIds: ['island_001', 'island_002'],
    }
    const started = startVoyage(ready, 'island_002', 20_000)
    if (!started.ok) throw new Error(started.message)
    expect(started.state.character.currentLocationId).toBe('island_001')
    expect(getGatheringAvailability(started.state, 'collect-driftwood', 20_001))
      .toBe('Không thể thu thập khi đang trên hành trình.')
    expect(getRecipeAvailability(started.state, 'recipe_wooden_axe'))
      .toBe('Không thể chế tạo khi đang trên hành trình.')

    const underway = advanceVoyages(started.state, 33_999)
    expect(underway.state.voyages[0].status).toBe('traveling')
    const arrived = advanceVoyages(underway.state, 34_000)
    expect(arrived.arrivedVoyageId).toBe(started.state.voyages[0].id)
    expect(arrived.state.character.currentLocationId).toBe('island_002')
    expect(arrived.state.ships[0].currentLocationId).toBe('island_002')
    expect(arrived.state.voyages[0]).toMatchObject({ status: 'arrived', arrivedAt: 34_000 })
  })

  it('blocks dangerous weather and lengthens travel in adverse weather', () => {
    const ready = {
      ...initialGameState,
      character: {
        ...initialGameState.character,
        researchedTechnologyIds: ['tech_seafaring'],
      },
      ships: [{
        id: 'raft-1',
        definitionId: 'ship_raft',
        currentLocationId: 'island_001',
        health: 100,
        status: 'docked' as const,
      }],
      discoveredIslandIds: ['island_001', 'island_002'],
    }

    const dangerous = {
      ...ready,
      weather: {
        weatherId: 'tropical_storm',
        locationId: 'island_001',
        changedAt: 0,
        changesAt: 100_000,
      },
    }
    expect(getVoyageAvailability(dangerous, 'island_002'))
      .toContain('Đi biển đang quá nguy hiểm')

    const adverse = {
      ...ready,
      weather: {
        weatherId: 'strong_wind',
        locationId: 'island_001',
        changedAt: 0,
        changesAt: 100_000,
      },
    }
    const trip = startVoyage(adverse, 'island_002', 20_000)
    if (!trip.ok) throw new Error(trip.message)
    expect(trip.state.voyages[0].completesAt).toBe(41_000)
  })

  it('upgrades a raft to a faster sailboat and shortens voyage time', () => {
    const raft = startShipConstruction({
      ...initialGameState,
      character: { ...initialGameState.character, researchedTechnologyIds: ['tech_seafaring'] },
      inventory: {
        ...initialGameState.inventory,
        slots: [...initialGameState.inventory.slots, { itemId: 'item_rope' as const, quantity: 3 }],
      },
    }, 'ship_raft', 1_000)
    if (!raft.ok) throw new Error(raft.message)
    const raftReady = completeShipConstruction(raft.state, 11_000).state
    let inventory = raftReady.inventory
    for (const [itemId, quantity] of [
      ['item_wood_plank', 16],
      ['item_wood_hard', 6],
      ['item_rope', 8],
      ['item_woven_cloth', 4],
      ['item_ship_parts', 3],
    ] as const) {
      const added = addItems(inventory, itemId, quantity)
      if (!added.ok) throw new Error(added.message)
      inventory = added.container
    }

    const readyForUpgrade = {
      ...raftReady,
      character: {
        ...raftReady.character,
        level: 8,
        researchedTechnologyIds: ['tech_seafaring', 'tech_ocean_frontier'],
      },
      discoveredIslandIds: [...raftReady.discoveredIslandIds, 'island_008'],
      inventory,
    }
    expect(getShipConstructionAvailability(readyForUpgrade, 'ship_sailboat')).toBeNull()
    const upgrade = startShipConstruction(readyForUpgrade, 'ship_sailboat', 12_000)
    if (!upgrade.ok) throw new Error(upgrade.message)
    expect(upgrade.state.shipConstruction?.upgradeShipId).toBe(raftReady.ships[0].id)
    expect(isValidGameSnapshot(upgrade.state)).toBe(true)

    const upgraded = completeShipConstruction(upgrade.state, 57_000).state
    expect(upgraded.ships).toHaveLength(1)
    expect(upgraded.ships[0]).toMatchObject({
      id: raftReady.ships[0].id,
      definitionId: 'ship_sailboat',
      health: 180,
      status: 'docked',
    })

    const readyToSail = { ...upgraded, discoveredIslandIds: ['island_001', 'island_002', 'island_008'] }
    const trip = startVoyage(readyToSail, 'island_002', 60_000)
    if (!trip.ok) throw new Error(trip.message)
    expect(trip.state.voyages[0].completesAt).toBe(69_100)
  })
})
