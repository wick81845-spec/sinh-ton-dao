import { describe, expect, it } from 'vitest'
import { initialGameState, newPlayerGameState } from '../../data/mockGameState'
import { randomGatheringActivityId } from '../../modules/gathering/data/gatheringConfig'
import { wildlifeObservationTasks } from '../../modules/exploration/data/explorationConfig'
import type { StorageAdapter } from '../storage/StorageAdapter'
import { createGameSaveService, isValidGameSnapshot } from './gameSaveService'

class MemoryStorage implements StorageAdapter {
  private values = new Map<string, unknown>()

  async get<T>(key: string): Promise<T | null> {
    const value = this.values.get(key)
    return value === undefined ? null : value as T
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value)
  }

  async remove(key: string): Promise<void> {
    this.values.delete(key)
  }
}

describe('gameSaveService', () => {
  it('accepts a custom home island name and rejects names longer than the profile limit', () => {
    expect(isValidGameSnapshot({
      ...initialGameState,
      character: { ...initialGameState.character, homeIslandName: 'Đảo Bình Yên' },
    })).toBe(true)
    expect(isValidGameSnapshot({
      ...initialGameState,
      character: { ...initialGameState.character, homeIslandName: 'x'.repeat(41) },
    })).toBe(false)
  })

  it('validates dedicated weapon and campfire fuel state', () => {
    const state = {
      ...initialGameState,
      buildings: [{
        id: 'campfire-1',
        definitionId: 'building_campfire',
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 80,
        status: 'completed' as const,
      }],
      equippedWeaponId: 'item_wooden_spear' as const,
      campfireFuel: { 'campfire-1': { remainingMs: 120_000, lastUpdatedAt: 1_000 } },
      clothesDrying: { buildingId: 'campfire-1', startedAt: 1_000, completesAt: 181_000 },
      itemDurability: { item_wooden_spear: 12 },
    }
    expect(isValidGameSnapshot(state)).toBe(true)
    expect(isValidGameSnapshot({ ...state, clothesDrying: { buildingId: 'missing', startedAt: 1_000, completesAt: 181_000 } })).toBe(false)
    expect(isValidGameSnapshot({ ...state, campfireFuel: { missing: { remainingMs: 1, lastUpdatedAt: 1 } } })).toBe(false)
    expect(isValidGameSnapshot({
      ...state,
      inventory: {
        ...state.inventory,
        slots: [...state.inventory.slots, { itemId: 'item_wooden_spear' as const, quantity: 1 }],
      },
    })).toBe(false)
    expect(isValidGameSnapshot({ ...state, ailments: [{ id: 'bleeding', elapsedMs: 10_000 }] })).toBe(true)
    expect(isValidGameSnapshot({
      ...state,
      ailments: [
        { id: 'heatstroke', elapsedMs: 600_000 },
        { id: 'hypothermia', elapsedMs: 300_000 },
        { id: 'poisoning', elapsedMs: 10_000 },
      ],
    })).toBe(true)
    expect(isValidGameSnapshot({ ...state, ailments: [{ id: 'unknown', elapsedMs: 10_000 }] })).toBe(false)
  })

  it('validates separate chicken and goat livestock pens', () => {
    const goatBuilding = {
      id: 'goat-pen-1',
      definitionId: 'building_goat_pen',
      islandId: initialGameState.character.homeIslandId,
      level: 1,
      health: 140,
      status: 'completed' as const,
    }
    const state = {
      ...initialGameState,
      buildings: [goatBuilding],
      livestockPens: [{ buildingId: goatBuilding.id, goatCount: 2, nextMilkAt: 10_000 }],
    }

    expect(isValidGameSnapshot(state)).toBe(true)
    expect(isValidGameSnapshot({
      ...state,
      livestockPens: [{ buildingId: goatBuilding.id, goatCount: 3, nextMilkAt: 10_000 }],
    })).toBe(false)
    expect(isValidGameSnapshot({
      ...state,
      livestockPens: [{ buildingId: goatBuilding.id, chickenCount: 1, nextEggAt: 10_000 }],
    })).toBe(false)
  })

  it('accepts existing saves that predate coins and skill experience', () => {
    const { coins: _coins, skillExperience: _skills, researchedTechnologyIds: _technologies, ...legacyCharacter } = initialGameState.character
    expect(isValidGameSnapshot({
      ...initialGameState,
      character: legacyCharacter,
    })).toBe(true)
  })

  it('accepts legacy saves with zero health and normalizes them as dead on load', () => {
    const legacyDeadSave = {
      ...initialGameState,
      survival: { ...initialGameState.survival, health: 0 },
      character: { ...initialGameState.character, status: 'alive' as const },
    }

    expect(isValidGameSnapshot(legacyDeadSave)).toBe(true)
    expect(isValidGameSnapshot({
      ...legacyDeadSave,
      character: { ...legacyDeadSave.character, status: 'dead' as const },
    })).toBe(true)
  })

  it('persists the new-player intro state without rejecting older saves', () => {
    expect(isValidGameSnapshot(newPlayerGameState)).toBe(true)
    expect(isValidGameSnapshot({ ...newPlayerGameState, tutorialIntroCompleted: 'pending' })).toBe(false)
    expect(isValidGameSnapshot({ ...newPlayerGameState, isResting: true })).toBe(true)
    expect(isValidGameSnapshot({ ...newPlayerGameState, isResting: 'yes' })).toBe(false)
    expect(isValidGameSnapshot({
      ...newPlayerGameState,
      inventory: { ...newPlayerGameState.inventory, maxSlots: 24 },
      backpackEquipped: true,
    })).toBe(true)
    expect(isValidGameSnapshot({
      ...newPlayerGameState,
      inventory: { ...newPlayerGameState.inventory, maxSlots: 12 },
      backpackEquipped: true,
    })).toBe(false)
    expect(isValidGameSnapshot({ ...newPlayerGameState, backpackEquipped: 'yes' })).toBe(false)
    expect(isValidGameSnapshot({ ...newPlayerGameState, itemDurability: { item_wooden_axe: 20 } })).toBe(true)
    expect(isValidGameSnapshot({ ...newPlayerGameState, itemDurability: { item_wooden_axe: 21 } })).toBe(false)
    expect(isValidGameSnapshot(initialGameState)).toBe(true)
  })

  it('accepts saves while the random gathering activity is in progress', () => {
    expect(isValidGameSnapshot({
      ...initialGameState,
      activeGathering: {
        activityId: randomGatheringActivityId,
        startedAt: 1_000,
        completesAt: 7_000,
        outcome: 'adverse',
      },
    })).toBe(true)
  })

  it('saves and restores versioned game data', async () => {
    const service = createGameSaveService(new MemoryStorage())
    const timestamp = Date.parse('2026-11-08T00:00:00.000Z')

    await service.save(initialGameState, timestamp)

    await expect(service.load()).resolves.toMatchObject({
      schemaVersion: 12,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: initialGameState,
    })
  })

  it('validates wildlife sightings against the matching exploration task', () => {
    const task = wildlifeObservationTasks.find((entry) => (
      entry.locationId === 'island_001' && entry.observedSpeciesId === 'turtle_land'
    ))
    if (!task) throw new Error('Starter-island wildlife observation should exist.')

    const sighting = {
      id: 'sighting-turtle',
      taskId: task.id,
      locationId: task.locationId,
      completedAt: 1_000,
      rewards: [],
      discoveredIslandIds: [],
      worldEventId: null,
      observedSpeciesId: 'turtle_land',
    }
    expect(isValidGameSnapshot({
      ...initialGameState,
      explorationLog: [sighting],
    })).toBe(true)
    expect(isValidGameSnapshot({
      ...initialGameState,
      explorationLog: [{ ...sighting, observedSpeciesId: 'wild_wolf' }],
    })).toBe(false)
  })

  it('adds newly introduced harvest locations to existing saves', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    const oldNodeIds = new Set(['shoreline', 'rocky-outcrop', 'wild-grove', 'forest-edge'])
    await storage.set('game.save', {
      schemaVersion: 5,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: {
        ...initialGameState,
        resourceNodes: initialGameState.resourceNodes.filter((node) => oldNodeIds.has(node.nodeId)),
      },
    })

    const restored = await service.load()
    expect(restored?.data.resourceNodes).toHaveLength(14)
    expect(restored?.data.resourceNodes.find((node) => node.nodeId === 'tidal-rocks'))
      .toMatchObject({ available: 18, respawnAt: null })
    expect(restored?.data.resourceNodes.find((node) => node.nodeId === 'iron-deposit'))
      .toMatchObject({ available: 16, respawnAt: null })
    expect(restored?.data.resourceNodes.find((node) => node.nodeId === 'riverbank-clay'))
      .toMatchObject({ available: 20, respawnAt: null })
    expect(restored?.data.resourceNodes.find((node) => node.nodeId === 'old-growth-forest'))
      .toMatchObject({ available: 12, respawnAt: null })
  })

  it('migrates version 5 food stacks with an expiry based on the saved timestamp', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    const savedAt = Date.parse('2026-11-08T00:00:00.000Z')
    await storage.set('game.save', {
      schemaVersion: 5,
      savedAt: new Date(savedAt).toISOString(),
      data: initialGameState,
    })

    const restored = await service.load()
    expect(restored?.schemaVersion).toBe(12)
    expect(restored?.data.inventory.slots.find((slot) => slot.itemId === 'item_wild_fruit')?.expiresAt)
      .toBe(savedAt + 3 * 60 * 60 * 1000)
    await expect(storage.get('game.save')).resolves.toMatchObject({ schemaVersion: 12 })
  })

  it('migrates version 6 saves to include empty campfire fuel state', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    await storage.set('game.save', {
      schemaVersion: 6,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: initialGameState,
    })

    await expect(service.load()).resolves.toMatchObject({
      schemaVersion: 12,
      data: { campfireFuel: {} },
    })
  })

  it('migrates version 7 saves to include empty injury state', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    await storage.set('game.save', {
      schemaVersion: 7,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: initialGameState,
    })

    await expect(service.load()).resolves.toMatchObject({
      schemaVersion: 12,
      data: { ailments: [] },
    })
  })

  it('migrates version 8 saves to include empty farm plots', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    await storage.set('game.save', {
      schemaVersion: 8,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: { ...initialGameState, ailments: [] },
    })

    await expect(service.load()).resolves.toMatchObject({
      schemaVersion: 12,
      data: { farmPlots: [] },
    })
  })

  it('migrates version 9 saves to include empty livestock pens', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    await storage.set('game.save', {
      schemaVersion: 9,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: { ...initialGameState, ailments: [], farmPlots: [] },
    })

    await expect(service.load()).resolves.toMatchObject({
      schemaVersion: 12,
      data: { livestockPens: [] },
    })
  })

  it('migrates version 10 saves to include empty rainwater collector state', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    await storage.set('game.save', {
      schemaVersion: 10,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: { ...initialGameState, ailments: [], farmPlots: [], livestockPens: [] },
    })

    await expect(service.load()).resolves.toMatchObject({
      schemaVersion: 12,
      data: { waterCollectors: {} },
    })
  })

  it('migrates old fish in version 11 saves to generic fresh fish', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    const oldState = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [
          ...initialGameState.inventory.slots,
          { itemId: 'item_leviathan', quantity: 2 },
          { itemId: 'item_anchovy', quantity: 3 },
        ],
      },
      itemDurability: { item_golden_tuna: 4, item_wooden_axe: 12 },
    }
    await storage.set('game.save', {
      schemaVersion: 11,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: oldState,
    })

    const restored = await service.load()
    expect(restored?.schemaVersion).toBe(12)
    expect(restored?.data.inventory.slots).toContainEqual({ itemId: 'item_fresh_fish', quantity: 2 })
    expect(restored?.data.inventory.slots).toContainEqual({ itemId: 'item_anchovy', quantity: 3 })
    expect(restored?.data.itemDurability).toEqual({ item_wooden_axe: 12 })
    await expect(storage.get('game.save')).resolves.toMatchObject({ schemaVersion: 12 })
  })

  it('keeps player saves separate when using different storage keys', async () => {
    const storage = new MemoryStorage()
    const firstPlayer = createGameSaveService(storage, 'game.save.player-1')
    const secondPlayer = createGameSaveService(storage, 'game.save.player-2')
    const firstState = {
      ...initialGameState,
      character: { ...initialGameState.character, name: 'Sóng' },
    }

    await firstPlayer.save(firstState, Date.parse('2026-11-08T00:00:00.000Z'))

    await expect(firstPlayer.load()).resolves.toMatchObject({ data: { character: { name: 'Sóng' } } })
    await expect(secondPlayer.load()).resolves.toBeNull()
  })

  it('rejects saves with an unsupported schema version', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    await storage.set('game.save', {
      schemaVersion: 0,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: initialGameState,
    })

    await expect(service.load()).rejects.toThrow('không hợp lệ hoặc không tương thích phiên bản')
  })

  it('rejects out-of-range survival values instead of restoring corrupted state', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    await storage.set('game.save', {
      schemaVersion: 5,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: {
        ...initialGameState,
        survival: { ...initialGameState.survival, hunger: 101 },
      },
    })

    await expect(service.load()).rejects.toThrow('không hợp lệ hoặc không tương thích phiên bản')
  })

  it('migrates schema version 1 saves while preserving character, survival, and bag contents', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    await storage.set('game.save', {
      schemaVersion: 1,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: {
        character: initialGameState.character,
        survival: initialGameState.survival,
        inventory: initialGameState.inventory.slots,
        inventoryCapacity: initialGameState.inventory.maxSlots,
      },
    })

    await expect(service.load()).resolves.toMatchObject({
      schemaVersion: 12,
      data: {
        character: initialGameState.character,
        survival: initialGameState.survival,
        inventory: initialGameState.inventory,
        storage: { ownerId: initialGameState.character.homeIslandId, slots: [], maxSlots: 40 },
        activeGathering: null,
        craftingQueue: [],
        buildings: [],
        constructionQueue: [],
        discoveredIslandIds: [initialGameState.character.homeIslandId],
        activeExploration: null,
        explorationLog: [],
        worldEventLog: [],
        ships: [],
        shipConstruction: null,
        voyages: [],
        friendIds: [],
        socialPlayerInventories: initialGameState.socialPlayerInventories,
        tradeOffers: [],
        activeCombat: null,
        combatLog: [],
      },
    })
  })

  it('migrates schema version 2 saves while preserving existing game state', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    const {
      craftingQueue: _craftingQueue,
      buildings: _buildings,
      constructionQueue: _constructionQueue,
      discoveredIslandIds: _discoveredIslandIds,
      activeExploration: _activeExploration,
      explorationLog: _explorationLog,
      worldEventLog: _worldEventLog,
      ships: _ships,
      shipConstruction: _shipConstruction,
      voyages: _voyages,
      friendIds: _friendIds,
      socialPlayerInventories: _socialPlayerInventories,
      tradeOffers: _tradeOffers,
      activeCombat: _activeCombat,
      combatLog: _combatLog,
      ...version2Data
    } = initialGameState
    await storage.set('game.save', {
      schemaVersion: 2,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: version2Data,
    })

    await expect(service.load()).resolves.toMatchObject({
      schemaVersion: 12,
      data: {
        character: initialGameState.character,
        inventory: initialGameState.inventory,
        storage: initialGameState.storage,
        resourceNodes: initialGameState.resourceNodes,
        craftingQueue: [],
        buildings: [],
        constructionQueue: [],
        discoveredIslandIds: [initialGameState.character.homeIslandId],
        activeExploration: null,
        explorationLog: [],
        worldEventLog: [],
        ships: [],
        shipConstruction: null,
        voyages: [],
        friendIds: [],
        socialPlayerInventories: initialGameState.socialPlayerInventories,
        tradeOffers: [],
        activeCombat: null,
        combatLog: [],
      },
    })
  })

  it('migrates schema version 3 saves while preserving crafting and buildings', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    const {
      discoveredIslandIds: _discoveredIslandIds,
      activeExploration: _activeExploration,
      explorationLog: _explorationLog,
      worldEventLog: _worldEventLog,
      ships: _ships,
      shipConstruction: _shipConstruction,
      voyages: _voyages,
      friendIds: _friendIds,
      socialPlayerInventories: _socialPlayerInventories,
      tradeOffers: _tradeOffers,
      activeCombat: _activeCombat,
      combatLog: _combatLog,
      ...version3Data
    } = initialGameState
    await storage.set('game.save', {
      schemaVersion: 3,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: version3Data,
    })

    await expect(service.load()).resolves.toMatchObject({
      schemaVersion: 12,
      data: {
        character: initialGameState.character,
        inventory: initialGameState.inventory,
        craftingQueue: initialGameState.craftingQueue,
        buildings: initialGameState.buildings,
        constructionQueue: initialGameState.constructionQueue,
        discoveredIslandIds: [initialGameState.character.homeIslandId],
        activeExploration: null,
        explorationLog: [],
        worldEventLog: [],
        ships: [],
        shipConstruction: null,
        voyages: [],
        friendIds: [],
        socialPlayerInventories: initialGameState.socialPlayerInventories,
        tradeOffers: [],
        activeCombat: null,
        combatLog: [],
      },
    })
  })

  it('migrates schema version 4 saves while preserving world and voyage state', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    const {
      friendIds: _friendIds,
      socialPlayerInventories: _socialPlayerInventories,
      tradeOffers: _tradeOffers,
      activeCombat: _activeCombat,
      combatLog: _combatLog,
      ...version4Data
    } = initialGameState
    await storage.set('game.save', {
      schemaVersion: 4,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: version4Data,
    })

    await expect(service.load()).resolves.toMatchObject({
      schemaVersion: 12,
      data: {
        character: initialGameState.character,
        discoveredIslandIds: initialGameState.discoveredIslandIds,
        ships: initialGameState.ships,
        voyages: initialGameState.voyages,
        friendIds: [],
        socialPlayerInventories: initialGameState.socialPlayerInventories,
        tradeOffers: [],
        activeCombat: null,
        combatLog: [],
      },
    })
  })

  it('repairs incomplete version 5 saves without discarding earlier progress', async () => {
    const storage = new MemoryStorage()
    const service = createGameSaveService(storage)
    const {
      friendIds: _friendIds,
      socialPlayerInventories: _socialPlayerInventories,
      tradeOffers: _tradeOffers,
      activeCombat: _activeCombat,
      combatLog: _combatLog,
      ...incompleteV5Data
    } = initialGameState
    const incompleteSave = {
      schemaVersion: 5,
      savedAt: '2026-11-08T00:00:00.000Z',
      data: incompleteV5Data,
    }
    await storage.set('game.save', incompleteSave)

    await expect(service.load()).resolves.toMatchObject({
      schemaVersion: 12,
      data: {
        character: initialGameState.character,
        inventory: initialGameState.inventory,
        discoveredIslandIds: initialGameState.discoveredIslandIds,
        voyages: initialGameState.voyages,
        friendIds: [],
        socialPlayerInventories: initialGameState.socialPlayerInventories,
        tradeOffers: [],
        activeCombat: null,
        combatLog: [],
      },
    })
    await expect(storage.get('game.save')).resolves.toMatchObject({ schemaVersion: 12, data: { friendIds: [] } })
  })
})
