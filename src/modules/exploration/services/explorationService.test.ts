import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { explorationTasks, wildlifeObservationTasks } from '../data/explorationConfig'
import { completeExploration, getExplorationAvailability, startExploration } from './explorationService'
import { islandDefinitions } from '../../world/data/worldDefinitions'

describe('explorationService', () => {
  it('reveals new islands and grants the configured reward only after the task completes', () => {
    const started = startExploration(initialGameState, 'survey-nearby-island', 1_000)
    if (!started.ok) throw new Error(started.message)

    expect(started.state.discoveredIslandIds).toEqual(['island_001'])
    expect(completeExploration(started.state, 8_999).status).toBe('pending')

    const result = completeExploration(started.state, 9_000)
    expect(result.status).toBe('completed')
    if (result.status !== 'completed') throw new Error('Island discovery should complete.')
    expect(result.state.discoveredIslandIds).toHaveLength(2)
    expect(result.state.discoveredIslandIds).toContain(result.state.explorationLog[0].discoveredIslandIds[0])
    expect(result.state.inventory.slots.find((slot) => slot.itemId === 'item_wild_fruit'))
      .toMatchObject({ itemId: 'item_wild_fruit', quantity: 7, expiresAt: expect.any(Number) })
    expect(result.state.explorationLog).toHaveLength(1)
  })

  it('records world events and discovered resources during exploration', () => {
    const atIsland = {
      ...initialGameState,
      discoveredIslandIds: ['island_001', 'island_002'],
      character: { ...initialGameState.character, currentLocationId: 'island_002' },
    }
    expect(getExplorationAvailability(atIsland, 'search-drift-cache')).toBeNull()
    const search = startExploration(atIsland, 'search-drift-cache', 10_000)
    if (!search.ok) throw new Error(search.message)
    const result = completeExploration(search.state, 22_000)

    expect(result.status).toBe('completed')
    expect(result.state.discoveredIslandIds).not.toContain('island_003')
    expect(result.state.worldEventLog).toMatchObject([
      { eventId: 'event_drift_cache', locationId: 'island_002', occurredAt: 22_000 },
    ])
    expect(result.state.inventory.slots).toContainEqual({ itemId: 'item_wood', quantity: 16 })
  })

  it('lets players discover all islands in an account-specific randomized order from any island', () => {
    let state = initialGameState
    state = { ...state, randomWorldEventSeed: 'account:player-one' }
    let now = 1_000

    while (state.discoveredIslandIds.length < islandDefinitions.length) {
      state = {
        ...state,
        character: {
          ...state.character,
          currentLocationId: state.discoveredIslandIds.at(-1) ?? 'island_001',
        },
        survival: { ...state.survival, stamina: 100 },
      }
      const started = startExploration(state, 'survey-nearby-island', now)
      if (!started.ok) throw new Error(started.message)

      const result = completeExploration(started.state, started.state.activeExploration!.completesAt)
      if (result.status !== 'completed') throw new Error('Island survey should complete.')
      state = result.state
      now += 30_000
    }

    expect(new Set(state.discoveredIslandIds)).toEqual(new Set(islandDefinitions.map((island) => island.id)))
    expect(getExplorationAvailability(state, 'survey-nearby-island')).toBe('Bạn đã phát hiện tất cả các hòn đảo.')
    expect(explorationTasks.some((task) => task.id === 'explore-island-island_013')).toBe(true)

    const anotherPlayer = {
      ...initialGameState,
      randomWorldEventSeed: 'account:player-two',
    }
    const otherSurvey = startExploration(anotherPlayer, 'survey-nearby-island', 1_000)
    if (!otherSurvey.ok) throw new Error(otherSurvey.message)
    const otherResult = completeExploration(otherSurvey.state, otherSurvey.state.activeExploration!.completesAt)
    if (otherResult.status !== 'completed') throw new Error('Second player survey should complete.')
    expect(otherResult.state.discoveredIslandIds[1]).not.toBe(state.explorationLog[0].discoveredIslandIds[0])
  })

  it('offers a unique exploration task when arriving at each discovered island', () => {
    for (const island of islandDefinitions) {
      const state = {
        ...initialGameState,
        discoveredIslandIds: [...new Set([...initialGameState.discoveredIslandIds, island.id])],
        character: { ...initialGameState.character, currentLocationId: island.id },
      }
      const taskId = `explore-island-${island.id}`
      expect(explorationTasks.some((task) => task.id === taskId)).toBe(true)
      expect(getExplorationAvailability(state, taskId)).toBeNull()
      const started = startExploration(state, taskId, 1_000)
      if (!started.ok) throw new Error(started.message)
      const result = completeExploration(started.state, started.state.activeExploration!.completesAt)
      expect(result.status).toBe('completed')
      if (result.status !== 'completed') throw new Error('Island exploration should complete.')
      expect(result.state.explorationLog.at(-1)?.locationId).toBe(island.id)
    }
  })

  it('records a safe wildlife sighting in the exploration journal', () => {
    const observation = wildlifeObservationTasks.find((task) => (
      task.locationId === 'island_001' && task.observedSpeciesId === 'turtle_land'
    ))
    if (!observation) throw new Error('Starter-island turtle observation should exist.')

    expect(getExplorationAvailability(initialGameState, observation.id)).toBeNull()
    const started = startExploration(initialGameState, observation.id, 1_000)
    if (!started.ok) throw new Error(started.message)
    expect(completeExploration(started.state, 6_999).status).toBe('pending')

    const result = completeExploration(started.state, 7_000)
    expect(result.status).toBe('completed')
    if (result.status !== 'completed') throw new Error('Wildlife observation should complete.')
    expect(result.state.explorationLog.at(-1)).toMatchObject({
      taskId: observation.id,
      locationId: 'island_001',
      observedSpeciesId: 'turtle_land',
      rewards: [],
    })
    expect(result.message).toContain('Rùa cạn')
    expect(result.state.survival.stamina).toBe(initialGameState.survival.stamina - observation.staminaCost)
    expect(getExplorationAvailability(result.state, observation.id)).toBe('Nhiệm vụ này đã hoàn thành.')
  })

  it('does not let a dead character start wildlife observations', () => {
    const observation = wildlifeObservationTasks.find((task) => task.locationId === 'island_001')
    if (!observation) throw new Error('Starter-island wildlife observation should exist.')
    const deadState = {
      ...initialGameState,
      character: { ...initialGameState.character, status: 'dead' as const },
      survival: { ...initialGameState.survival, health: 0 },
    }

    expect(startExploration(deadState, observation.id, 1_000)).toMatchObject({
      ok: false,
      message: 'Bạn cần hồi sinh trước khi thám hiểm.',
    })
  })
})
