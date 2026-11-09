import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { consumeItem, transferItems } from './inventoryService'

describe('inventoryService', () => {
  it('moves an item stack between containers without mutating the inputs', () => {
    const result = transferItems(
      initialGameState.inventory,
      initialGameState.storage,
      'item_wood',
      4,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.message)
    expect(result.source.slots[0]).toEqual({ itemId: 'item_wood', quantity: 8 })
    expect(result.destination.slots[0]).toEqual({ itemId: 'item_wood', quantity: 4 })
    expect(initialGameState.inventory.slots[0].quantity).toBe(12)
  })

  it('keeps the source unchanged when the destination has no room', () => {
    const result = transferItems(
      initialGameState.inventory,
      { ...initialGameState.storage, maxSlots: 0 },
      'item_wood',
      4,
    )

    expect(result).toEqual({ ok: false, message: 'Không đủ ô trống trong vật chứa.' })
    expect(initialGameState.inventory.slots[0].quantity).toBe(12)
  })

  it('uses one fruit to restore hunger and consume exactly one item', () => {
    const result = consumeItem(initialGameState, 'item_wild_fruit')

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.message)
    expect(result.state.survival.hunger).toBe(94)
    expect(result.state.inventory.slots[2]).toEqual({ itemId: 'item_wild_fruit', quantity: 4 })
  })

  it('drinks collected stream water to restore thirst', () => {
    const inventory = {
      ...initialGameState.inventory,
      slots: [...initialGameState.inventory.slots, { itemId: 'item_fresh_water' as const, quantity: 1 }],
    }
    const result = consumeItem({ ...initialGameState, inventory }, 'item_fresh_water')

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.message)
    expect(result.state.survival.thirst).toBe(99)
    expect(result.state.survival.hunger).toBe(initialGameState.survival.hunger)
    expect(result.state.inventory.slots.some((slot) => slot.itemId === 'item_fresh_water')).toBe(false)
  })
})
