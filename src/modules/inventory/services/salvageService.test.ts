import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { openSalvageContainer } from './salvageService'

describe('openSalvageContainer', () => {
  it('uses a distinct reward pool for each salvage container', () => {
    const sunkenCrate = openSalvageContainer({
      ...initialGameState,
      inventory: { ...initialGameState.inventory, slots: [{ itemId: 'item_sunken_crate', quantity: 1 }] },
    }, 'item_sunken_crate', 1_000, () => 0)
    const metalBox = openSalvageContainer({
      ...initialGameState,
      inventory: { ...initialGameState.inventory, slots: [{ itemId: 'item_metal_box', quantity: 1 }] },
    }, 'item_metal_box', 1_000, () => 0)
    const smallChest = openSalvageContainer({
      ...initialGameState,
      inventory: { ...initialGameState.inventory, slots: [{ itemId: 'item_small_chest', quantity: 1 }] },
    }, 'item_small_chest', 1_000, () => 0)

    expect(sunkenCrate).toMatchObject({ ok: true, reward: { itemId: 'item_dried_fruit', quantity: 1 } })
    expect(metalBox).toMatchObject({ ok: true, reward: { itemId: 'item_iron_ore', quantity: 1 } })
    expect(smallChest).toMatchObject({ ok: true, reward: { itemId: 'item_wreckage_material', quantity: 1 } })
  })

  it('does not consume the container if inventory cannot fit its reward', () => {
    const fullInventory = {
      ...initialGameState.inventory,
      maxSlots: 1,
      slots: [{ itemId: 'item_sunken_crate' as const, quantity: 2 }],
    }
    const result = openSalvageContainer({
      ...initialGameState,
      inventory: fullInventory,
    }, 'item_sunken_crate', 1_000, () => 0)

    expect(result).toEqual({ ok: false, message: 'Không đủ ô trống trong vật chứa.' })
    expect(fullInventory.slots).toEqual([{ itemId: 'item_sunken_crate', quantity: 2 }])
  })

  it('requires the player to carry the container and be alive', () => {
    const notCarried = openSalvageContainer(initialGameState, 'item_sunken_crate')
    const dead = openSalvageContainer({
      ...initialGameState,
      character: { ...initialGameState.character, status: 'dead' },
    }, 'item_sunken_crate')

    expect(notCarried).toEqual({ ok: false, message: 'Không đủ vật phẩm trong vật chứa.' })
    expect(dead).toEqual({ ok: false, message: 'Bạn cần hồi sinh trước khi mở vật phẩm trục vớt.' })
  })
})
