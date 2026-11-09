import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { buyMarketItem, sellMarketItem } from './marketService'

describe('marketService', () => {
  it('charges coins and adds a purchased item atomically', () => {
    const stateAtAnotherIsland = {
      ...initialGameState,
      character: { ...initialGameState.character, currentLocationId: 'island_002' },
    }
    const result = buyMarketItem(stateAtAnotherIsland, 'item_wood_soft')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.character.coins).toBe(20)
    expect(result.state.inventory.slots).toContainEqual({ itemId: 'item_wood_soft', quantity: 1 })
  })

  it('refunds neither coins nor items when a purchase cannot fit', () => {
    const fullState = {
      ...initialGameState,
      character: { ...initialGameState.character, currentLocationId: 'island_002' },
      inventory: {
        ...initialGameState.inventory,
        maxSlots: initialGameState.inventory.slots.length,
      },
    }

    const result = buyMarketItem(fullState, 'item_wood_soft')

    expect(result).toEqual({ ok: false, message: 'Túi đồ đã đầy; hãy dọn chỗ trước khi mua.' })
    expect(fullState.character.coins).toBe(25)
  })

  it('pays the listed sell value and rejects selling more than owned', () => {
    const stateAtAnotherIsland = {
      ...initialGameState,
      character: { ...initialGameState.character, currentLocationId: 'island_002' },
      inventory: {
        ...initialGameState.inventory,
        slots: [...initialGameState.inventory.slots, { itemId: 'item_dried_fruit' as const, quantity: 5 }],
      },
    }
    const result = sellMarketItem(stateAtAnotherIsland, 'item_dried_fruit', 2)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.character.coins).toBe(31)
    expect(result.state.inventory.slots).toContainEqual({ itemId: 'item_dried_fruit', quantity: 3 })
    expect(sellMarketItem(stateAtAnotherIsland, 'item_dried_fruit', 6).ok).toBe(false)
  })

  it('keeps the market unavailable on the starter island', () => {
    expect(buyMarketItem(initialGameState, 'item_wood')).toEqual({
      ok: false,
      message: 'Chợ không có mặt tại hòn đảo này.',
    })
    expect(sellMarketItem(initialGameState, 'item_wild_fruit', 1)).toEqual({
      ok: false,
      message: 'Chợ không có mặt tại hòn đảo này.',
    })
  })

  it('offers different stock on each island and rejects stock from another island', () => {
    const forestState = {
      ...initialGameState,
      character: { ...initialGameState.character, currentLocationId: 'island_002' },
    }

    expect(buyMarketItem(forestState, 'item_wood')).toEqual({
      ok: false,
      message: 'Vật phẩm này không được giao dịch tại chợ.',
    })
    expect(buyMarketItem(forestState, 'item_wood_soft').ok).toBe(true)
    expect(buyMarketItem({
      ...initialGameState,
      character: { ...initialGameState.character, currentLocationId: 'island_003', coins: 100 },
    }, 'item_giant_grouper_rare').ok).toBe(true)
  })

  it('rejects legendary fish for purchase and sale', () => {
    const stateWithLegendary = {
      ...initialGameState,
      character: {
        ...initialGameState.character,
        currentLocationId: 'island_003',
        coins: 100,
      },
      inventory: {
        ...initialGameState.inventory,
        slots: [...initialGameState.inventory.slots, { itemId: 'item_leviathan' as const, quantity: 1 }],
      },
    }

    expect(buyMarketItem(stateWithLegendary, 'item_leviathan')).toEqual({
      ok: false,
      message: 'Vật phẩm này chỉ dành cho sưu tầm, không thể giao dịch.',
    })
    expect(sellMarketItem(stateWithLegendary, 'item_leviathan', 1)).toEqual({
      ok: false,
      message: 'Vật phẩm này chỉ dành cho sưu tầm, không thể giao dịch.',
    })
  })
})
