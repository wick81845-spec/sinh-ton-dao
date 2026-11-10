import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { collectEggs, collectGoatMilk, raiseChicken, raiseGoat } from './livestockService'

function coopState() {
  return {
    ...initialGameState,
    inventory: {
      ...initialGameState.inventory,
      slots: [{ itemId: 'item_chicken' as const, quantity: 2 }],
    },
    buildings: [{
      id: 'coop-1',
      definitionId: 'building_chicken_coop',
      islandId: initialGameState.character.currentLocationId,
      level: 1,
      health: 120,
      status: 'completed' as const,
    }],
  }
}

describe('livestockService', () => {
  it('raises chicks in the completed coop and schedules egg production', () => {
    const raised = raiseChicken(coopState(), 'coop-1', 1_000)

    expect(raised.ok).toBe(true)
    if (!raised.ok) throw new Error(raised.message)
    expect(raised.state.livestockPens).toEqual([{
      buildingId: 'coop-1',
      chickenCount: 1,
      nextEggAt: 601_000,
    }])
    expect(raised.state.inventory.slots).toEqual([{ itemId: 'item_chicken', quantity: 1 }])
  })

  it('produces one egg per chicken per interval and advances collection time', () => {
    const raised = raiseChicken(coopState(), 'coop-1', 1_000)
    if (!raised.ok) throw new Error(raised.message)
    const secondChicken = raiseChicken(raised.state, 'coop-1', 2_000)
    if (!secondChicken.ok) throw new Error(secondChicken.message)

    expect(collectEggs(secondChicken.state, 'coop-1', 600_999)).toMatchObject({
      ok: false,
      message: 'Gà chưa đẻ trứng; hãy chờ thêm.',
    })
    const collected = collectEggs(secondChicken.state, 'coop-1', 601_000)
    expect(collected.ok).toBe(true)
    if (!collected.ok) throw new Error(collected.message)
    expect(collected.state.inventory.slots).toContainEqual({
      itemId: 'item_egg',
      quantity: 2,
      expiresAt: 601_000 + 24 * 60 * 60 * 1000,
    })
    expect(collected.state.livestockPens?.[0].nextEggAt).toBe(1_201_000)
  })

  it('caps coop capacity at three chickens', () => {
    const state = {
      ...coopState(),
      livestockPens: [{ buildingId: 'coop-1', chickenCount: 3, nextEggAt: 1_000 }],
    }
    expect(raiseChicken(state, 'coop-1', 1_000)).toEqual({
      ok: false,
      message: 'Chuồng gà đã đủ sức chứa.',
    })
  })

  it('raises goats in their own pen and produces fresh milk by the animal and period', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_goat' as const, quantity: 2 }],
      },
      buildings: [{
        id: 'goat-pen-1',
        definitionId: 'building_goat_pen',
        islandId: initialGameState.character.currentLocationId,
        level: 1,
        health: 140,
        status: 'completed' as const,
      }],
    }

    const raised = raiseGoat(state, 'goat-pen-1', 1_000)
    expect(raised.ok).toBe(true)
    if (!raised.ok) throw new Error(raised.message)
    expect(raised.state.livestockPens).toEqual([{
      buildingId: 'goat-pen-1',
      goatCount: 1,
      nextMilkAt: 901_000,
    }])

    const second = raiseGoat(raised.state, 'goat-pen-1', 2_000)
    if (!second.ok) throw new Error(second.message)
    expect(second.state.livestockPens?.[0]).toMatchObject({ goatCount: 2, nextMilkAt: 901_000 })
    expect(collectGoatMilk(second.state, 'goat-pen-1', 900_999)).toMatchObject({
      ok: false,
      message: 'Dê chưa cho sữa; hãy chờ thêm.',
    })
    const collected = collectGoatMilk(second.state, 'goat-pen-1', 901_000)
    expect(collected.ok).toBe(true)
    if (!collected.ok) throw new Error(collected.message)
    expect(collected.state.inventory.slots).toContainEqual({
      itemId: 'item_goat_milk',
      quantity: 2,
      expiresAt: 901_000 + 4 * 60 * 60 * 1000,
    })
    expect(collected.state.livestockPens?.[0].nextMilkAt).toBe(1_801_000)
  })

  it('caps goat capacity at two and does not permit chicken actions on a goat pen', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_goat' as const, quantity: 1 }],
      },
      buildings: [{
        id: 'goat-pen-1',
        definitionId: 'building_goat_pen',
        islandId: initialGameState.character.currentLocationId,
        level: 1,
        health: 140,
        status: 'completed' as const,
      }],
      livestockPens: [{ buildingId: 'goat-pen-1', goatCount: 2, nextMilkAt: 1_000 }],
    }
    expect(raiseGoat(state, 'goat-pen-1', 1_000)).toEqual({
      ok: false,
      message: 'Chuồng dê đã đủ sức chứa.',
    })
    expect(collectEggs(state, 'goat-pen-1', 1_000).ok).toBe(false)
  })
})
