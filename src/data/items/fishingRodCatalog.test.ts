import { describe, expect, it } from 'vitest'
import { itemDefinitions } from './itemDefinitions'
import { fishingRodCatalog, getBestFishingRod } from './fishingRodCatalog'
import { initialGameState } from '../mockGameState'
import { recipes } from '../../modules/crafting/data/recipes'

describe('fishingRodCatalog', () => {
  it('registers all seven illustrated rods as craftable, durable tools', () => {
    expect(fishingRodCatalog).toHaveLength(7)
    for (const [index, rod] of fishingRodCatalog.entries()) {
      expect(rod.image).toBe(`/assets/fishing/rods/rod-${index + 1}.png`)
      expect(itemDefinitions[rod.itemId]).toMatchObject({
        name: rod.name,
        image: rod.image,
        maxDurability: rod.maxDurability,
      })
      expect(recipes.some((recipe) => recipe.output.itemId === rod.itemId)).toBe(true)
    }

    for (const [index, rod] of fishingRodCatalog.entries()) {
      if (index === 0) continue
      expect(recipes.find((recipe) => recipe.output.itemId === rod.itemId)?.ingredients)
        .toContainEqual({ itemId: fishingRodCatalog[index - 1].itemId, quantity: 1 })
    }
  })

  it('selects the strongest rod that still has durability', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [
          ...initialGameState.inventory.slots,
          { itemId: 'item_fishing_rod' as const, quantity: 1 },
          { itemId: 'item_fishing_rod_2' as const, quantity: 1 },
        ],
      },
      itemDurability: { item_fishing_rod_2: 0 },
    }

    expect(getBestFishingRod(state)?.itemId).toBe('item_fishing_rod')
    expect(getBestFishingRod({
      ...state,
      inventory: { ...state.inventory, slots: [] },
      equippedWeaponId: 'item_fishing_rod_2',
      itemDurability: { item_fishing_rod_2: 18 },
    })?.itemId).toBe('item_fishing_rod_2')
    expect(getBestFishingRod({
      ...state,
      itemDurability: { item_fishing_rod: 0, item_fishing_rod_2: 0 },
    })).toBeUndefined()
  })
})
