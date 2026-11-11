import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { fuelCampfire } from './campfireService'
import {
  advanceClothesDrying,
  clothesDryingDurationMs,
  getClothesDryingRemainingMs,
  startClothesDrying,
} from './clothesDryingService'

function litCampfireState(wetness = 65, islandId = initialGameState.character.homeIslandId) {
  const state = {
    ...initialGameState,
    character: { ...initialGameState.character, currentLocationId: islandId },
    survival: { ...initialGameState.survival, wetness },
    inventory: {
      ...initialGameState.inventory,
      slots: [...initialGameState.inventory.slots, { itemId: 'item_branch' as const, quantity: 2 }],
    },
    buildings: [{
      id: 'campfire-1',
      definitionId: 'building_campfire',
      islandId,
      level: 1,
      health: 80,
      status: 'completed' as const,
    }],
  }
  const fueled = fuelCampfire(state, 'campfire-1', 'item_branch', 1_000)
  if (!fueled.ok) throw new Error(fueled.message)
  return fueled.state
}

describe('clothesDryingService', () => {
  it('dries wet clothes after three minutes beside a sufficiently fueled fire', () => {
    const started = startClothesDrying(litCampfireState(), 'campfire-1', 1_000)
    expect(started.ok).toBe(true)
    if (!started.ok) throw new Error(started.message)

    expect(started.state.clothesDrying?.completesAt).toBe(1_000 + clothesDryingDurationMs)
    expect(started.state.survival.wetness).toBe(65)
    expect(getClothesDryingRemainingMs(started.state, 91_000)).toBe(90_000)
    expect(advanceClothesDrying(started.state, 180_999)).toMatchObject({
      state: started.state,
      completed: false,
    })

    const completed = advanceClothesDrying(started.state, 181_000)
    expect(completed.completed).toBe(true)
    expect(completed.state.survival.wetness).toBe(0)
    expect(completed.state.clothesDrying).toBeNull()
  })

  it('requires wet clothes and enough remaining fire time', () => {
    expect(startClothesDrying(litCampfireState(0), 'campfire-1', 1_000)).toMatchObject({
      ok: false,
      message: 'Quần áo đã khô, chưa cần phơi.',
    })
    const shortFire = {
      ...litCampfireState(),
      campfireFuel: { 'campfire-1': { remainingMs: 120_000, lastUpdatedAt: 1_000 } },
    }
    expect(startClothesDrying(shortFire, 'campfire-1', 1_000)).toMatchObject({
      ok: false,
      message: 'Cần lửa trại cháy liên tục ít nhất 3 phút để phơi quần áo.',
    })
  })

  it('does not dry clothes when the required campfire is not lit at the current location', () => {
    const state = {
      ...initialGameState,
      survival: { ...initialGameState.survival, wetness: 65 },
      buildings: [{
        id: 'campfire-1',
        definitionId: 'building_campfire',
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 80,
        status: 'completed' as const,
      }],
    }

    expect(startClothesDrying(state, 'campfire-1', 1_000).ok).toBe(false)
    expect(startClothesDrying(litCampfireState(65, 'island_002'), 'campfire-1', 1_000).ok).toBe(true)
  })
})
