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

  it('accepts existing saves that predate coins and skill experience', () => {
    const { coins: _coins, skillExperience: _skills, researchedTechnologyIds: _technologies, ...legacyCharacter } = initialGameState.character
    expect(isValidGameSnapshot({
      ...initialGameState,
      character: legacyCharacter,
    })).toBe(true)
  })

  it('persists the new-player intro state without rejecting older saves', () => {
    expect(isValidGameSnapshot(newPlayerGameState)).toBe(true)
    expect(isValidGameSnapshot({ ...newPlayerGameState, tutorialIntroCompleted: 'pending' })).toBe(false)
    expect(isValidGameSnapshot({ ...newPlayerGameState, isResting: true })).toBe(true)
    expect(isValidGameSnapshot({ ...newPlayerGameState, isResting: 'yes' })).toBe(false)
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
      schemaVersion: 5,
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
    expect(restored?.data.resourceNodes).toHaveLength(8)
    expect(restored?.data.resourceNodes.find((node) => node.nodeId === 'tidal-rocks'))
      .toMatchObject({ available: 18, respawnAt: null })
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
      schemaVersion: 5,
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
      schemaVersion: 5,
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
      schemaVersion: 5,
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
      schemaVersion: 5,
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
      schemaVersion: 5,
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
    await expect(storage.get('game.save')).resolves.toMatchObject({ schemaVersion: 5, data: { friendIds: [] } })
  })
})
