import { describe, expect, it } from 'vitest'
import { initialGameState, newPlayerGameState } from '../../../data/mockGameState'
import {
  addItems,
  consumeItem,
  discardItems,
  equipBackpack,
  equipWeapon,
  initializeFoodFreshness,
  spoilExpiredFood,
  transferItems,
  repairItem,
  unequipBackpack,
  unequipWeapon,
} from './inventoryService'

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

  it('preserves partial food freshness when withdrawing a stack from storage', () => {
    const expiresAt = 50_000
    const source = {
      ...initialGameState.storage,
      slots: [{ itemId: 'item_fresh_fish' as const, quantity: 3, expiresAt }],
    }
    const result = transferItems(source, initialGameState.inventory, 'item_fresh_fish', 1)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.message)
    expect(result.destination.slots.find((slot) => slot.itemId === 'item_fresh_fish')).toMatchObject({
      quantity: 1,
      expiresAt,
    })
    expect(result.source.slots[0]).toMatchObject({ quantity: 2, expiresAt })
  })

  it('assigns freshness to legacy food and converts expired food without deleting it', () => {
    const freshlyAdded = addItems(initialGameState.inventory, 'item_fresh_fish', 2, 1_000)
    expect(freshlyAdded.ok).toBe(true)
    if (!freshlyAdded.ok) throw new Error(freshlyAdded.message)
    expect(freshlyAdded.container.slots.find((slot) => slot.itemId === 'item_fresh_fish')?.expiresAt)
      .toBe(1_000 + 60 * 60 * 1000)

    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_fresh_fish' as const, quantity: 2 }],
      },
    }
    const initialized = initializeFoodFreshness(state, 1_000)
    expect(initialized.changed).toBe(true)
    expect(initialized.state.inventory.slots[0].expiresAt).toBe(1_000 + 60 * 60 * 1000)

    const expired = spoilExpiredFood(initialized.state, 1_000 + 60 * 60 * 1000)
    expect(expired.spoiledQuantity).toBe(2)
    expect(expired.state.inventory.slots).toEqual([{ itemId: 'item_spoiled_food', quantity: 2 }])
  })

  it('does not allow eating food after its expiry timestamp', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_wild_fruit' as const, quantity: 1, expiresAt: 1_000 }],
      },
    }
    expect(consumeItem(state, 'item_wild_fruit', 1_000)).toEqual({
      ok: false,
      message: 'Thức ăn này đã ôi thiu, không thể sử dụng.',
    })
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

  it('lets wild fruit provide a small health recovery when injured', () => {
    const state = {
      ...initialGameState,
      survival: { ...initialGameState.survival, health: 70 },
    }
    const result = consumeItem(state, 'item_wild_fruit')

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.message)
    expect(result.state.survival.health).toBe(72)
    expect(result.state.survival.hunger).toBe(94)
    expect(result.message).toContain('Sức khỏe +2')
  })

  it('lets mushroom soup restore hunger, thirst, and a little health', () => {
    const state = {
      ...initialGameState,
      survival: { ...initialGameState.survival, health: 70 },
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_mushroom_soup' as const, quantity: 1 }],
      },
    }
    const result = consumeItem(state, 'item_mushroom_soup')
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.message)
    expect(result.state.survival).toMatchObject({ hunger: 96, thirst: 86, health: 72 })
  })

  it('lets a new survivor discard an unwanted stack', () => {
    const result = discardItems(newPlayerGameState, 'item_wild_fruit', 3)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.message)
    expect(result.state.inventory.slots.some((slot) => slot.itemId === 'item_wild_fruit')).toBe(false)
    expect(result.message).toContain('Đã vứt bỏ 3 Quả dại')
  })

  it('equips a crafted backpack and expands new-player inventory from 12 to 24 slots', () => {
    const state = {
      ...newPlayerGameState,
      inventory: {
        ...newPlayerGameState.inventory,
        slots: [...newPlayerGameState.inventory.slots, { itemId: 'item_backpack' as const, quantity: 1 }],
      },
    }

    expect(state.inventory.maxSlots).toBe(12)
    const equipped = equipBackpack(state)
    expect(equipped.ok).toBe(true)
    if (!equipped.ok) throw new Error(equipped.message)
    expect(equipped.state.backpackEquipped).toBe(true)
    expect(equipped.state.inventory.maxSlots).toBe(24)
    expect(equipped.state.inventory.slots.some((slot) => slot.itemId === 'item_backpack')).toBe(false)
  })

  it('requires a free slot to unequip a backpack and preserves it when blocked', () => {
    const equippedState = {
      ...initialGameState,
      backpackEquipped: true,
      inventory: {
        ...initialGameState.inventory,
        maxSlots: 24,
        slots: Array.from({ length: 12 }, (_, index) => ({
          itemId: (index % 2 === 0 ? 'item_wood' : 'item_stone') as 'item_wood' | 'item_stone',
          quantity: 1,
        })),
      },
    }

    expect(unequipBackpack(equippedState)).toMatchObject({
      ok: false,
      message: 'Hãy để trống ít nhất 1 ô trước khi tháo ba lô.',
    })
    const withFreeSlot = {
      ...equippedState,
      inventory: { ...equippedState.inventory, slots: equippedState.inventory.slots.slice(0, 11) },
    }
    const unequipped = unequipBackpack(withFreeSlot)
    expect(unequipped.ok).toBe(true)
    if (!unequipped.ok) throw new Error(unequipped.message)
    expect(unequipped.state.backpackEquipped).toBe(false)
    expect(unequipped.state.inventory.maxSlots).toBe(12)
    expect(unequipped.state.inventory.slots).toContainEqual({ itemId: 'item_backpack', quantity: 1 })
  })

  it('moves a weapon into its dedicated equipment slot and back without losing durability', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_wooden_spear' as const, quantity: 1 }],
      },
    }
    const equipped = equipWeapon(state, 'item_wooden_spear')
    expect(equipped.ok).toBe(true)
    if (!equipped.ok) throw new Error(equipped.message)
    expect(equipped.state.equippedWeaponId).toBe('item_wooden_spear')
    expect(equipped.state.inventory.slots).toEqual([])
    expect(equipped.state.itemDurability?.item_wooden_spear).toBe(15)

    const stored = unequipWeapon(equipped.state)
    expect(stored.ok).toBe(true)
    if (!stored.ok) throw new Error(stored.message)
    expect(stored.state.equippedWeaponId).toBeUndefined()
    expect(stored.state.inventory.slots).toContainEqual({ itemId: 'item_wooden_spear', quantity: 1 })
    expect(stored.state.itemDurability?.item_wooden_spear).toBe(15)
  })

  it('repairs a damaged equipped weapon at the workbench using materials', () => {
    const state = {
      ...initialGameState,
      equippedWeaponId: 'item_wooden_spear' as const,
      itemDurability: { item_wooden_spear: 4 },
      buildings: [{
        id: 'workbench-1',
        definitionId: 'building_workbench',
        islandId: initialGameState.character.currentLocationId,
        level: 1,
        health: 100,
        status: 'completed' as const,
      }],
    }
    const repaired = repairItem(state, 'item_wooden_spear')
    expect(repaired.ok).toBe(true)
    if (!repaired.ok) throw new Error(repaired.message)
    expect(repaired.state.itemDurability?.item_wooden_spear).toBe(15)
    expect(repaired.state.inventory.slots.find((slot) => slot.itemId === 'item_wood')?.quantity).toBe(10)
    expect(repaired.state.inventory.slots.find((slot) => slot.itemId === 'item_stone')?.quantity).toBe(7)
  })
})
