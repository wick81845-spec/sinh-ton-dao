import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { wildlifeObservationTasks } from '../data/explorationConfig'
import { completeExploration, getExplorationAvailability, startExploration } from './explorationService'

describe('explorationService', () => {
  it('reveals new islands and grants the configured reward only after the task completes', () => {
    const started = startExploration(initialGameState, 'survey-nearby-island', 1_000)
    if (!started.ok) throw new Error(started.message)

    expect(started.state.discoveredIslandIds).toEqual(['island_001'])
    expect(completeExploration(started.state, 8_999).status).toBe('pending')

    const result = completeExploration(started.state, 9_000)
    expect(result.status).toBe('completed')
    expect(result.state.discoveredIslandIds).toEqual(['island_001', 'island_002'])
    expect(result.state.inventory.slots).toContainEqual({ itemId: 'item_wild_fruit', quantity: 7 })
    expect(result.state.explorationLog).toHaveLength(1)
  })

  it('records world events and discovered resources during exploration', () => {
    const survey = startExploration(initialGameState, 'survey-nearby-island', 1_000)
    if (!survey.ok) throw new Error(survey.message)
    const surveyed = completeExploration(survey.state, 9_000)
    if (surveyed.status !== 'completed') throw new Error('Survey should have completed.')

    const atIsland = {
      ...surveyed.state,
      character: { ...surveyed.state.character, currentLocationId: 'island_002' },
    }
    expect(getExplorationAvailability(atIsland, 'search-drift-cache')).toBeNull()
    const search = startExploration(atIsland, 'search-drift-cache', 10_000)
    if (!search.ok) throw new Error(search.message)
    const result = completeExploration(search.state, 22_000)

    expect(result.status).toBe('completed')
    expect(result.state.discoveredIslandIds).toContain('island_003')
    expect(result.state.worldEventLog).toMatchObject([
      { eventId: 'event_drift_cache', locationId: 'island_002', occurredAt: 22_000 },
    ])
    expect(result.state.inventory.slots).toContainEqual({ itemId: 'item_wood', quantity: 16 })
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
