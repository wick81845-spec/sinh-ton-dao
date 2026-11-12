import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import {
  advanceCampfireFuel,
  fuelCampfire,
  fuelCookingStove,
  getCampfireRemainingMs,
  isCookingStoveFueledAt,
  isCampfireLitAt,
  setCampfireWarming,
} from './campfireService'

function litCampfireState(islandId = initialGameState.character.homeIslandId) {
  return {
    ...initialGameState,
    character: { ...initialGameState.character, currentLocationId: islandId },
    buildings: [{
      id: 'campfire-1',
      definitionId: 'building_campfire',
      islandId,
      level: 1,
      health: 80,
      status: 'completed' as const,
    }],
    inventory: {
      ...initialGameState.inventory,
      slots: [
        ...initialGameState.inventory.slots,
        { itemId: 'item_branch' as const, quantity: 2 },
      ],
    },
  }
}

describe('campfireService', () => {
  it('consumes fuel and starts the fire for the fuel-specific duration', () => {
    const result = fuelCampfire(litCampfireState(), 'campfire-1', 'item_branch', 1_000)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.message)
    expect(result.state.campfireFuel?.['campfire-1']).toEqual({ remainingMs: 2 * 60_000, lastUpdatedAt: 1_000 })
    expect(result.state.inventory.slots.find((slot) => slot.itemId === 'item_branch')?.quantity).toBe(1)
    expect(isCampfireLitAt(result.state, 'campfire-1', 1_000)).toBe(true)
  })

  it('allows fueling a campfire on another island when present there', () => {
    expect(fuelCampfire(litCampfireState('island_002'), 'campfire-1', 'item_branch', 1_000).ok).toBe(true)
  })

  it('advances fuel by elapsed real time and records when the fire goes out', () => {
    const fueled = fuelCampfire(litCampfireState(), 'campfire-1', 'item_branch', 1_000)
    if (!fueled.ok) throw new Error(fueled.message)
    const advanced = advanceCampfireFuel(fueled.state, 301_000)
    expect(advanced.extinguishedBuildingIds).toEqual(['campfire-1'])
    expect(advanced.state.campfireFuel?.['campfire-1']).toEqual({ remainingMs: 0, lastUpdatedAt: 301_000 })
    expect(getCampfireRemainingMs(advanced.state, 'campfire-1', 301_000)).toBe(0)
  })

  it('adds new fuel to remaining burn time instead of resetting it', () => {
    const first = fuelCampfire(litCampfireState(), 'campfire-1', 'item_branch', 1_000)
    if (!first.ok) throw new Error(first.message)
    const second = fuelCampfire(first.state, 'campfire-1', 'item_branch', 61_000)
    expect(second.ok).toBe(true)
    if (!second.ok) throw new Error(second.message)
    expect(second.state.campfireFuel?.['campfire-1']?.remainingMs).toBe(3 * 60_000)
  })

  it('requires and consumes separate fuel for a cooking stove', () => {
    const state = {
      ...litCampfireState(),
      buildings: [{
        id: 'stove-1',
        definitionId: 'building_cooking_stove',
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 140,
        status: 'completed' as const,
      }],
    }

    expect(isCookingStoveFueledAt(state, 1_000)).toBe(false)
    const fueled = fuelCookingStove(state, 'stove-1', 'item_branch', 1_000)
    expect(fueled.ok).toBe(true)
    if (!fueled.ok) throw new Error(fueled.message)
    expect(fueled.state.campfireFuel?.['stove-1']).toEqual({ remainingMs: 2 * 60_000, lastUpdatedAt: 1_000 })
    expect(isCookingStoveFueledAt(fueled.state, 1_000)).toBe(true)
    expect(fuelCookingStove(state, 'campfire-1', 'item_branch', 1_000).ok).toBe(false)
  })

  it('only starts warming beside a lit campfire when body temperature is low', () => {
    const coldState = {
      ...litCampfireState(),
      survival: { ...initialGameState.survival, bodyTemperature: 34 },
      campfireFuel: { 'campfire-1': { remainingMs: 60_000, lastUpdatedAt: 1_000 } },
    }

    expect(setCampfireWarming(coldState, 'campfire-1', 1_000, true)).toMatchObject({
      ok: true,
      state: { isWarmingAtCampfire: true },
    })
    expect(setCampfireWarming(coldState, 'campfire-1', 61_000, true)).toMatchObject({
      ok: false,
      message: 'Cần có lửa trại đang cháy để sưởi ấm.',
    })
    expect(setCampfireWarming({
      ...coldState,
      survival: { ...coldState.survival, bodyTemperature: 37 },
    }, 'campfire-1', 1_000, true)).toMatchObject({ ok: false })
    expect(setCampfireWarming(coldState, 'campfire-1', 1_000, false)).toMatchObject({
      ok: true,
      state: { isWarmingAtCampfire: false },
    })
  })
})
