import { describe, expect, it, vi } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { randomGatheringActivityId, resourceNodeDefinitions } from '../data/gatheringConfig'
import { getFishAvailableAt } from '../data/fishingConfig'
import {
  completeGathering,
  getGatheringAvailability,
  refreshResourceNodes,
  startGathering,
} from './gatheringService'

const exploredState = {
  ...initialGameState,
  explorationLog: [{
    id: 'exploration-test',
    taskId: 'survey-nearby-island',
    locationId: 'island_001',
    completedAt: 1,
    rewards: [{ itemId: 'item_wild_fruit' as const, quantity: 2 }],
    discoveredIslandIds: ['island_002'],
    worldEventId: null,
  }],
}

const stateWithAxe = {
  ...exploredState,
  inventory: {
    ...exploredState.inventory,
    slots: [...exploredState.inventory.slots, { itemId: 'item_wooden_axe' as const, quantity: 1 }],
  },
}

describe('gatheringService', () => {
  it('only adds local resources after the activity timer completes', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const started = startGathering(initialGameState, 'collect-driftwood', 1000)
    if (!started.ok) throw new Error(started.message)

    expect(started.state.inventory.slots[0].quantity).toBe(12)
    expect(started.state.activeGathering?.completesAt).toBe(6000)
    expect(completeGathering(started.state, 5999).status).toBe('pending')

    const completed = completeGathering(started.state, 6000)
    random.mockRestore()
    expect(completed.status).toBe('completed')
    if (completed.status !== 'completed') throw new Error('Gathering should complete.')
    expect(completed.quantity).toBe(3)
    expect(completed.state.inventory.slots[0]).toEqual({ itemId: 'item_wood', quantity: 15 })
    expect(completed.state.inventory.slots).toContainEqual({ itemId: 'item_seashell', quantity: 2 })
    expect(completed.state.resourceNodes.find((node) => node.nodeId === 'shoreline'))
      .toMatchObject({ available: 27, respawnAt: null })
    expect(completed.rewards).toContainEqual({ itemId: 'item_seashell', quantity: 2 })
    expect(completed.state.activeGathering).toBeNull()
    expect(completed.state.survival.stamina).toBe(83)
  })

  it('uses the 75/15/10 ordinary, lucky, and adverse outcome thresholds', () => {
    for (const [roll, outcome] of [
      [0.099, 'adverse'],
      [0.1, 'lucky'],
      [0.25, 'ordinary'],
    ] as const) {
      const random = vi.spyOn(Math, 'random').mockReturnValue(roll)
      const started = startGathering(initialGameState, 'collect-driftwood', 1000)
      random.mockRestore()

      expect(started.ok).toBe(true)
      if (!started.ok) throw new Error(started.message)
      expect(started.state.activeGathering?.outcome).toBe(outcome)
      expect(started.state.activeGathering?.completesAt).toBe(outcome === 'adverse' ? 36_000 : 6_000)
    }
  })

  it('awards lucky finds from the selected location', () => {
    const random = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.15)
      .mockReturnValue(0.99)
    const started = startGathering(initialGameState, 'pick-wild-fruit', 1000)
    if (!started.ok) throw new Error(started.message)
    const completed = completeGathering(started.state, started.state.activeGathering?.completesAt ?? 5000)
    random.mockRestore()

    expect(completed.status).toBe('completed')
    if (completed.status !== 'completed') throw new Error('Gathering should complete.')
    expect(completed.itemId).toBe('item_wild_fruit')
    expect(completed.rewards).toContainEqual({ itemId: 'item_coconut', quantity: 2 })
    expect(completed.state.inventory.slots.find((slot) => slot.itemId === 'item_coconut')?.quantity).toBe(2)
    expect(completed.state.inventory.slots.find((slot) => slot.itemId === 'item_seashell')).toBeUndefined()
  })

  it('adds a real delay and a small health penalty for adverse outcomes', () => {
    const random = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.05)
      .mockReturnValue(0.99)
    const started = startGathering(initialGameState, 'collect-driftwood', 1000)
    if (!started.ok) throw new Error(started.message)

    expect(completeGathering(started.state, 6000).status).toBe('pending')
    const completed = completeGathering(started.state, 36_000)
    random.mockRestore()

    expect(completed.status).toBe('completed')
    if (completed.status !== 'completed') throw new Error('Gathering should complete.')
    expect(completed.state.survival.health).toBe(initialGameState.survival.health - 3)
    expect(completed.message).toContain('vỏ sò sắc')
  })

  it('gates the eight locations by starter, exploration, and tool milestones', () => {
    expect(resourceNodeDefinitions).toHaveLength(8)
    expect(resourceNodeDefinitions.filter((node) => node.unlockStage === 'starter').map((node) => node.id))
      .toEqual(['shoreline', 'wild-grove', 'palm-grove'])
    expect(resourceNodeDefinitions.filter((node) => node.unlockStage === 'exploration').map((node) => node.id))
      .toEqual(['forest-edge', 'rocky-outcrop'])
    expect(resourceNodeDefinitions.filter((node) => node.unlockStage === 'tool').map((node) => node.id))
      .toEqual(['fallen-tree', 'freshwater-stream', 'tidal-rocks'])
    expect(getGatheringAvailability(initialGameState, 'collect-stones', 1000))
      .toContain('thám hiểm')
    expect(getGatheringAvailability(initialGameState, 'collect-stream-water', 1000))
      .toContain('Rìu gỗ')
    expect(getGatheringAvailability(exploredState, 'chop-forest-wood', 1000))
      .toContain('Rìu gỗ trong túi')
    expect(getGatheringAvailability(stateWithAxe, 'collect-stream-water', 1000)).toBeNull()
    expect(getGatheringAvailability(initialGameState, 'collect-driftwood', 1000)).toBeNull()
    expect(getGatheringAvailability(initialGameState, 'pick-wild-fruit', 1000)).toBeNull()
    expect(getGatheringAvailability(initialGameState, 'collect-palm-grove', 1000)).toBeNull()
  })

  it('depletes and restores each location resource according to its respawn time', () => {
    const depletedState = {
      ...initialGameState,
      resourceNodes: initialGameState.resourceNodes.map((node) => (
        node.nodeId === 'shoreline' ? { ...node, available: 2 } : node
      )),
    }
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const started = startGathering(depletedState, 'collect-driftwood', 1000)
    if (!started.ok) throw new Error(started.message)
    const completed = completeGathering(started.state, 6000)
    random.mockRestore()

    expect(completed.status).toBe('completed')
    if (completed.status !== 'completed') throw new Error('Gathering should complete.')
    const depletedNode = completed.state.resourceNodes.find((node) => node.nodeId === 'shoreline')
    expect(depletedNode).toMatchObject({ available: 0, respawnAt: 126_000 })
    expect(refreshResourceNodes(completed.state.resourceNodes, 125_999)
      .find((node) => node.nodeId === 'shoreline')?.available).toBe(0)
    expect(refreshResourceNodes(completed.state.resourceNodes, 126_000)
      .find((node) => node.nodeId === 'shoreline')).toMatchObject({ available: 30, respawnAt: null })
  })

  it('uses the selected island-appropriate activity for a random harvest', () => {
    const rainforestIsland = {
      ...initialGameState,
      character: { ...initialGameState.character, currentLocationId: 'island_002' },
    }
    const random = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0)
      .mockReturnValue(0.99)
    const started = startGathering(rainforestIsland, randomGatheringActivityId, 1000)
    if (!started.ok) throw new Error(started.message)

    expect(started.state.activeGathering).toEqual({
      activityId: randomGatheringActivityId,
      startedAt: 1000,
      completesAt: 7000,
      outcome: 'ordinary',
    })

    expect(completeGathering(started.state, 6999).status).toBe('pending')

    const completed = completeGathering(started.state, 7000)
    random.mockRestore()
    expect(completed.status).toBe('completed')
    if (completed.status !== 'completed') throw new Error('Gathering should complete.')
    expect(completed.itemId).toBe('item_wild_fruit')
    expect(completed.state.inventory.slots).toContainEqual({ itemId: 'item_wild_fruit', quantity: 8 })
    expect(completed.state.activeGathering).toBeNull()
  })

  it('awards the fish fought in the minigame and rejects fish from other zones', () => {
    const started = startGathering(initialGameState, 'shore-fishing', 1000)
    if (!started.ok) throw new Error(started.message)

    const caught = completeGathering(started.state, 2000, 60, 'item_sardine')
    expect(caught.status).toBe('completed')
    if (caught.status !== 'completed') throw new Error('Fishing should complete.')
    expect(caught.itemId).toBe('item_sardine')

    const wrongZone = completeGathering(started.state, 2000, 60, 'item_leviathan')
    expect(wrongZone.status).toBe('failed')
    if (wrongZone.status !== 'failed') throw new Error('Fish from another zone must be rejected.')
    expect(wrongZone.message).toContain('không có ở vùng biển hiện tại')
    expect(wrongZone.state.inventory).toEqual(started.state.inventory)
  })

  it('awards ocean trash and rejects salvage unavailable in the current zone', () => {
    const started = startGathering(initialGameState, 'shore-fishing', 1000)
    if (!started.ok) throw new Error(started.message)

    const caughtTrash = completeGathering(started.state, 2000, 60, 'item_glass_bottle')
    expect(caughtTrash.status).toBe('completed')
    if (caughtTrash.status !== 'completed') throw new Error('Fishing trash should be collectible.')
    expect(caughtTrash.rewards).toEqual([{ itemId: 'item_glass_bottle', quantity: 1 }])
    expect(caughtTrash.state.inventory.slots).toContainEqual({ itemId: 'item_glass_bottle', quantity: 1 })

    const unavailableTreasure = completeGathering(started.state, 2000, 60, 'item_small_chest')
    expect(unavailableTreasure.status).toBe('failed')
    if (unavailableTreasure.status !== 'failed') throw new Error('Shipwreck treasure must not appear on the coast.')
    expect(unavailableTreasure.message).toContain('không thể câu được ở vùng biển hiện tại')
  })

  it('uses the resource catalog for tool requirements, duration, and variable yield', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const started = startGathering(stateWithAxe, 'chop-forest-wood', 1000)
    if (!started.ok) throw new Error(started.message)

    expect(started.state.activeGathering?.completesAt).toBe(11_000)
    const completed = completeGathering(started.state, 11_000)
    random.mockRestore()
    expect(completed.status).toBe('completed')
    if (completed.status !== 'completed') throw new Error('Gathering should complete.')
    expect(completed.itemId).toBe('item_wood_soft')
    expect(completed.quantity).toBeGreaterThanOrEqual(1)
    expect(completed.quantity).toBeLessThanOrEqual(7)
  })

  it('runs a timed fishing activity and adds one fish only when it completes', () => {
    const started = startGathering(initialGameState, 'shore-fishing', 1000)
    if (!started.ok) throw new Error(started.message)

    expect(started.state.activeGathering?.completesAt).toBe(61_000)
    expect(started.state.inventory.slots).toEqual(initialGameState.inventory.slots)

    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    const completed = completeGathering(started.state, 8000)
    random.mockRestore()
    expect(completed.status).toBe('completed')
    if (completed.status !== 'completed') throw new Error('Fishing should complete.')
    expect(completed.itemId).toBe('item_anchovy')
    expect(completed.quantity).toBe(1)
    expect(completed.rewards).toEqual([{ itemId: 'item_anchovy', quantity: 1 }])
    expect(completed.state.inventory.slots).toContainEqual({ itemId: 'item_anchovy', quantity: 1 })
    expect(completed.state.survival.stamina).toBe(79)
    expect(completed.state.resourceNodes).toEqual(initialGameState.resourceNodes)
  })

  it('catches a fish from the current biome and ocean zone', () => {
    const state = {
      ...initialGameState,
      weather: { weatherId: 'sunny', locationId: 'island_001', changedAt: 0, changesAt: 300_000 },
      activeGathering: { activityId: 'shore-fishing', startedAt: 1_000, completesAt: 9_000 },
    }
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const completed = completeGathering(state, 9_000)
    random.mockRestore()

    expect(completed.status).toBe('completed')
    if (completed.status !== 'completed') throw new Error('Fishing should complete.')
    expect(getFishAvailableAt('tropical_island', 'sunny', 'coastal_water')
      .some((fish) => fish.itemId === completed.itemId)).toBe(true)
  })

  it('requires stamina and inventory space before fishing', () => {
    const noStamina = {
      ...initialGameState,
      survival: { ...initialGameState.survival, stamina: 2 },
    }
    expect(startGathering(noStamina, 'shore-fishing', 1000)).toMatchObject({
      ok: false,
      message: 'Không đủ thể lực để câu cá.',
    })

    const fullInventory = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        maxSlots: initialGameState.inventory.slots.length,
      },
    }
    expect(startGathering(fullInventory, 'shore-fishing', 1000)).toMatchObject({
      ok: false,
      message: 'Túi đồ đã đầy; hãy cất bớt vật phẩm trước khi câu cá.',
    })
  })
})
