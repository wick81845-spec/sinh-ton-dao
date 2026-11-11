import { describe, expect, it } from 'vitest'
import { initialGameState, newPlayerGameState } from '../../../data/mockGameState'
import {
  addItems,
  consumeItem,
  discardItems,
  equipAccessory,
  equipBackpack,
  equipWeapon,
  getCarriedWeight,
  getCarriedWeightLimit,
  initializeFoodFreshness,
  isInventoryOverloaded,
  spoilExpiredFood,
  transferItems,
  repairItem,
  unequipAccessory,
  unequipBackpack,
  unequipWeapon,
} from './inventoryService'
import type { ItemId, ItemQuantity } from '../../../shared/types/game'

function createRepairState(itemId: ItemId, materials: readonly ItemQuantity[], equipped = false) {
  const slots = [
    ...materials.map((material) => ({ ...material })),
    ...(equipped ? [] : [{ itemId, quantity: 1 }]),
  ]
  return {
    ...initialGameState,
    inventory: { ...initialGameState.inventory, slots },
    ...(equipped ? { equippedWeaponId: itemId } : {}),
    itemDurability: { ...initialGameState.itemDurability, [itemId]: 1 },
    buildings: [{
      id: 'workbench-1',
      definitionId: 'building_workbench',
      islandId: initialGameState.character.currentLocationId,
      level: 1,
      health: 100,
      status: 'completed' as const,
    }],
  }
}

describe('inventoryService', () => {
  it('calculates carried weight and enforces the capacity from available bag slots', () => {
    const nearlyFullBag = {
      ...newPlayerGameState.inventory,
      slots: [{ itemId: 'item_wood' as const, quantity: 59 }],
    }
    const overloadedBag = {
      ...nearlyFullBag,
      slots: [{ itemId: 'item_wood' as const, quantity: 60 }],
    }

    expect(getCarriedWeight(initialGameState.inventory)).toBe(15)
    expect(getCarriedWeightLimit(newPlayerGameState.inventory)).toBe(30)
    expect(isInventoryOverloaded(nearlyFullBag)).toBe(false)
    expect(isInventoryOverloaded(overloadedBag)).toBe(true)
    expect(getCarriedWeightLimit(initialGameState.inventory)).toBe(60)
  })

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

  it('uses a medicinal poultice to cure injuries even when health is full', () => {
    const state = {
      ...initialGameState,
      ailments: [
        { id: 'bleeding' as const, elapsedMs: 30_000 },
        { id: 'infection' as const, elapsedMs: 60_000 },
      ],
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_medicinal_poultice' as const, quantity: 1 }],
      },
    }

    const result = consumeItem(state, 'item_medicinal_poultice')

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.message)
    expect(result.state.ailments).toEqual([])
    expect(result.state.survival.health).toBe(initialGameState.survival.health)
    expect(result.state.inventory.slots).toEqual([])
  })

  it('causes poisoning from poisonous mushrooms and allows treatment with an antidote', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_poisonous_mushroom' as const, quantity: 1 }],
      },
    }
    const poisoned = consumeItem(state, 'item_poisonous_mushroom')
    expect(poisoned.ok).toBe(true)
    if (!poisoned.ok) throw new Error(poisoned.message)
    expect(poisoned.state.ailments).toEqual([{ id: 'poisoning', elapsedMs: 0 }])
    expect(poisoned.message).toContain('ngộ độc')

    const treated = consumeItem({
      ...poisoned.state,
      inventory: {
        ...poisoned.state.inventory,
        slots: [{ itemId: 'item_herbal_antidote' as const, quantity: 1 }],
      },
    }, 'item_herbal_antidote')
    expect(treated.ok).toBe(true)
    if (!treated.ok) throw new Error(treated.message)
    expect(treated.state.ailments).toEqual([])
    expect(treated.message).toContain('ngộ độc')
  })

  it('treats heatstroke with boiled water and hypothermia with warm tea', () => {
    const state = {
      ...initialGameState,
      ailments: [
        { id: 'heatstroke' as const, elapsedMs: 10 * 60 * 1000 },
        { id: 'hypothermia' as const, elapsedMs: 10 * 60 * 1000 },
      ],
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_clean_water' as const, quantity: 1 },
          { itemId: 'item_warm_tea' as const, quantity: 1 },
        ],
      },
    }
    const cooled = consumeItem(state, 'item_clean_water')
    expect(cooled.ok).toBe(true)
    if (!cooled.ok) throw new Error(cooled.message)
    expect(cooled.state.ailments).toEqual([{ id: 'hypothermia', elapsedMs: 10 * 60 * 1000 }])

    const warmed = consumeItem(cooled.state, 'item_warm_tea')
    expect(warmed.ok).toBe(true)
    if (!warmed.ok) throw new Error(warmed.message)
    expect(warmed.state.ailments).toEqual([])
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

  it('moves weapons and tools into the equipment slot and back without losing durability', () => {
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

    const rodState = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_fishing_rod' as const, quantity: 1 }],
      },
    }
    const equippedRod = equipWeapon(rodState, 'item_fishing_rod')
    expect(equippedRod.ok).toBe(true)
    if (!equippedRod.ok) throw new Error(equippedRod.message)
    expect(equippedRod.state.equippedWeaponId).toBe('item_fishing_rod')
    expect(equippedRod.state.inventory.slots).toEqual([])
    expect(equippedRod.state.itemDurability?.item_fishing_rod).toBe(12)
    const storedRod = unequipWeapon(equippedRod.state)
    expect(storedRod.ok).toBe(true)
    if (!storedRod.ok) throw new Error(storedRod.message)
    expect(storedRod.state.inventory.slots).toEqual([{ itemId: 'item_fishing_rod', quantity: 1 }])
    expect(equipWeapon({
      ...rodState,
      inventory: { ...rodState.inventory, slots: [{ itemId: 'item_backpack', quantity: 1 }] },
    }, 'item_backpack')).toMatchObject({ ok: false })
  })

  it('replaces an equipped tool and lets consumables be selected in the accessory slot', () => {
    const state = {
      ...initialGameState,
      equippedWeaponId: 'item_wooden_axe' as const,
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_stone_pickaxe' as const, quantity: 1 },
          { itemId: 'item_fresh_water' as const, quantity: 2 },
        ],
      },
    }

    const replaced = equipWeapon(state, 'item_stone_pickaxe')
    expect(replaced.ok).toBe(true)
    if (!replaced.ok) throw new Error(replaced.message)
    expect(replaced.state.equippedWeaponId).toBe('item_stone_pickaxe')
    expect(replaced.state.inventory.slots).toContainEqual({ itemId: 'item_wooden_axe', quantity: 1 })

    const selected = equipAccessory(replaced.state, 'item_fresh_water')
    expect(selected.ok).toBe(true)
    if (!selected.ok) throw new Error(selected.message)
    expect(selected.state.equippedAccessoryId).toBe('item_fresh_water')
    expect(selected.state.inventory.slots).toContainEqual({ itemId: 'item_fresh_water', quantity: 2 })
    expect(equipAccessory(selected.state, 'item_wood')).toMatchObject({ ok: false })

    const cleared = unequipAccessory(selected.state)
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) throw new Error(cleared.message)
    expect(cleared.state.equippedAccessoryId).toBeUndefined()
  })

  it.each([
    {
      itemId: 'item_wooden_axe',
      maximum: 20,
      equipped: true,
      materials: [{ itemId: 'item_wood', quantity: 2 }, { itemId: 'item_stone', quantity: 1 }],
    },
    {
      itemId: 'item_wooden_spear',
      maximum: 15,
      equipped: true,
      materials: [
        { itemId: 'item_branch', quantity: 1 },
        { itemId: 'item_stone', quantity: 1 },
        { itemId: 'item_rope', quantity: 1 },
      ],
    },
    {
      itemId: 'item_stone_pickaxe',
      maximum: 30,
      equipped: false,
      materials: [
        { itemId: 'item_rough_stone', quantity: 2 },
        { itemId: 'item_branch', quantity: 1 },
        { itemId: 'item_rope', quantity: 1 },
      ],
    },
    {
      itemId: 'item_shovel',
      maximum: 24,
      equipped: false,
      materials: [
        { itemId: 'item_stone', quantity: 1 },
        { itemId: 'item_branch', quantity: 1 },
        { itemId: 'item_rope', quantity: 1 },
      ],
    },
    {
      itemId: 'item_copper_axe',
      maximum: 60,
      equipped: false,
      materials: [
        { itemId: 'item_copper_ingot', quantity: 1 },
        { itemId: 'item_branch', quantity: 1 },
        { itemId: 'item_rope', quantity: 1 },
      ],
    },
    {
      itemId: 'item_iron_axe',
      maximum: 100,
      equipped: false,
      materials: [
        { itemId: 'item_iron_ingot', quantity: 1 },
        { itemId: 'item_branch', quantity: 1 },
        { itemId: 'item_rope', quantity: 1 },
      ],
    },
    {
      itemId: 'item_fishing_rod',
      maximum: 12,
      equipped: false,
      materials: [{ itemId: 'item_branch', quantity: 1 }, { itemId: 'item_plant_fiber', quantity: 1 }],
    },
    {
      itemId: 'item_fishing_spear',
      maximum: 18,
      equipped: false,
      materials: [
        { itemId: 'item_stone', quantity: 1 },
        { itemId: 'item_branch', quantity: 1 },
        { itemId: 'item_rope', quantity: 1 },
      ],
    },
  ] as const)(
    'repairs $itemId at the workbench using its own materials',
    ({ itemId, maximum, equipped, materials }) => {
    const state = createRepairState(itemId, materials, equipped)
    const repaired = repairItem(state, itemId)
    expect(repaired.ok).toBe(true)
    if (!repaired.ok) throw new Error(repaired.message)
    expect(repaired.state.itemDurability?.[itemId]).toBe(maximum)
    for (const material of materials) {
      expect(repaired.state.inventory.slots.find((slot) => slot.itemId === material.itemId)).toBeUndefined()
    }
    if (equipped) expect(repaired.state.equippedWeaponId).toBe(itemId)
    else expect(repaired.state.inventory.slots).toContainEqual({ itemId, quantity: 1 })
    },
  )

  it('reports the missing metal needed to repair an axe without consuming anything', () => {
    const state = createRepairState('item_iron_axe', [
      { itemId: 'item_branch', quantity: 1 },
      { itemId: 'item_rope', quantity: 1 },
    ])
    const repaired = repairItem(state, 'item_iron_axe')

    expect(repaired).toEqual({ ok: false, message: 'Không đủ nguyên liệu để sửa: Thỏi sắt.' })
    expect(state.inventory.slots).toEqual([
      { itemId: 'item_branch', quantity: 1 },
      { itemId: 'item_rope', quantity: 1 },
      { itemId: 'item_iron_axe', quantity: 1 },
    ])
  })
})
