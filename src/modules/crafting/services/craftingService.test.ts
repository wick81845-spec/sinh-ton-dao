import { describe, expect, it } from 'vitest'
import { initialGameState, newPlayerGameState } from '../../../data/mockGameState'
import { completeConstructions, startConstruction } from '../../building/services/buildingService'
import { completeCrafting, getRecipeAvailability, queueRecipe } from './craftingService'
import { researchTechnology } from '../../progression/services/technologyService'
import { consumeItem } from '../../inventory/services/inventoryService'
import { itemDefinitions } from '../../../data/items/itemDefinitions'

function gameWithWorkbench() {
  const preparedState = {
    ...initialGameState,
    inventory: {
      ...initialGameState.inventory,
      slots: [
        ...initialGameState.inventory.slots.filter((slot) => slot.itemId !== 'item_wood' && slot.itemId !== 'item_stone'),
        { itemId: 'item_wood' as const, quantity: 12 },
        { itemId: 'item_stone' as const, quantity: 8 },
      ],
    },
  }
  const construction = startConstruction(preparedState, 'building_workbench', 1_000)
  if (!construction.ok) throw new Error(construction.message)
  const completed = completeConstructions(construction.state, 7_000).state
  const research = researchTechnology(completed, 'tech_basic_tools')
  if (!research.ok) throw new Error(research.message)
  return {
    ...research.state,
    inventory: {
      ...research.state.inventory,
      slots: research.state.inventory.slots.map((slot) => slot.itemId === 'item_wood'
        ? { ...slot, quantity: slot.quantity + 3 }
        : slot),
    },
  }
}

describe('craftingService', () => {
  it('requires a completed crafting station', () => {
    const state = {
      ...initialGameState,
      character: { ...initialGameState.character, researchedTechnologyIds: ['tech_basic_tools'] },
    }
    expect(getRecipeAvailability(state, 'recipe_wood_plank')).toBe('Cần có bàn chế tạo đã hoàn thành.')
  })

  it('requires technology research before using a recipe', () => {
    const state = {
      ...initialGameState,
      buildings: [{
        id: 'workbench',
        definitionId: 'building_workbench',
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 100,
        status: 'completed' as const,
      }],
    }
    expect(getRecipeAvailability(state, 'recipe_wood_plank'))
      .toBe('Cần nghiên cứu công nghệ mở khóa công thức này.')
  })

  it('lets a new survivor craft the starter axe by hand', () => {
    expect(getRecipeAvailability(newPlayerGameState, 'recipe_wooden_axe')).toBeNull()
    const queued = queueRecipe(newPlayerGameState, 'recipe_wooden_axe', 10_000)
    if (!queued.ok) throw new Error(queued.message)

    expect(queued.state.inventory.slots).not.toContainEqual({ itemId: 'item_wood', quantity: 4 })
    expect(queued.state.inventory.slots).not.toContainEqual({ itemId: 'item_stone', quantity: 5 })
    expect(completeCrafting(queued.state, 16_000).status).toBe('completed')
  })

  it('requires the kiln and progression level for charcoal production', () => {
    const state = {
      ...initialGameState,
      character: { ...initialGameState.character, level: 2, researchedTechnologyIds: ['tech_advanced_production'] },
    }

    expect(getRecipeAvailability(state, 'recipe_charcoal')).toBe('Cần có lò nung đã hoàn thành.')
  })

  it('requires a fueled campfire and cooks fresh fish at the campfire', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_fresh_fish' as const, quantity: 1 }],
      },
      buildings: [{
        id: 'campfire-1',
        definitionId: 'building_campfire',
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 80,
        status: 'completed' as const,
      }],
    }

    expect(getRecipeAvailability(state, 'recipe_roast_fish', 1_000))
      .toBe('Cần có lửa trại đang cháy; hãy thêm nhiên liệu cho lửa trại.')
    const fueled = { ...state, campfireFuel: { 'campfire-1': { remainingMs: 60_000, lastUpdatedAt: 1_000 } } }
    const queued = queueRecipe(fueled, 'recipe_roast_fish', 1_000)
    if (!queued.ok) throw new Error(queued.message)
    expect(completeCrafting(queued.state, 11_000).state.inventory.slots)
      .toContainEqual({ itemId: 'item_cooked_fish', quantity: 1, expiresAt: expect.any(Number) })
  })

  it('prepares an herbal antidote at a fueled campfire', () => {
    const state = {
      ...initialGameState,
      character: {
        ...initialGameState.character,
        level: 2,
        researchedTechnologyIds: ['tech_water_safety'],
      },
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_wild_herb' as const, quantity: 2 },
          { itemId: 'item_clean_water' as const, quantity: 1 },
        ],
      },
      buildings: [{
        id: 'campfire-1',
        definitionId: 'building_campfire',
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 80,
        status: 'completed' as const,
      }],
      campfireFuel: { 'campfire-1': { remainingMs: 60_000, lastUpdatedAt: 1_000 } },
    }

    expect(getRecipeAvailability(state, 'recipe_herbal_antidote', 1_000)).toBeNull()
    const queued = queueRecipe(state, 'recipe_herbal_antidote', 1_000)
    if (!queued.ok) throw new Error(queued.message)
    const completed = completeCrafting(queued.state, 15_000)
    expect(completed.status).toBe('completed')
    expect(completed.state.inventory.slots).toContainEqual({
      itemId: 'item_herbal_antidote',
      quantity: 1,
    })
  })

  it('preserves fresh goat milk as cheese at the cooking stove', () => {
    const state = {
      ...initialGameState,
      character: {
        ...initialGameState.character,
        level: 4,
        researchedTechnologyIds: ['tech_food_preservation'],
      },
      discoveredIslandIds: [...initialGameState.discoveredIslandIds, 'island_002'],
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_goat_milk' as const, quantity: 2 },
          { itemId: 'item_sea_salt' as const, quantity: 1 },
        ],
      },
      buildings: [{
        id: 'cooking-stove-1',
        definitionId: 'building_cooking_stove',
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 100,
        status: 'completed' as const,
      }],
    }

    expect(getRecipeAvailability(state, 'recipe_goat_cheese')).toBeNull()
    const queued = queueRecipe(state, 'recipe_goat_cheese', 1_000)
    if (!queued.ok) throw new Error(queued.message)
    const completed = completeCrafting(queued.state, 26_000)
    expect(completed.status).toBe('completed')
    expect(completed.state.inventory.slots).toContainEqual({
      itemId: 'item_cheese',
      quantity: 1,
      expiresAt: expect.any(Number),
    })
  })

  it('gates dried fish behind the drying rack and discovery of the second island', () => {
    const state = {
      ...initialGameState,
      character: { ...initialGameState.character, level: 2 },
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_fresh_fish' as const, quantity: 2 }],
      },
      buildings: [{
        id: 'drying-rack-1',
        definitionId: 'building_drying_rack',
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 100,
        status: 'completed' as const,
      }],
    }

    expect(getRecipeAvailability(state, 'recipe_dried_fish'))
      .toBe('Cần khám phá Đảo Rừng Dạt để học công thức này.')
    const discovered = { ...state, discoveredIslandIds: [...state.discoveredIslandIds, 'island_002'] }
    const queued = queueRecipe(discovered, 'recipe_dried_fish', 1_000)
    if (!queued.ok) throw new Error(queued.message)
    const completed = completeCrafting(queued.state, 31_000)
    expect(completed.status).toBe('completed')
    expect(completed.state.inventory.slots).toContainEqual({
      itemId: 'item_dried_fish',
      quantity: 1,
      expiresAt: expect.any(Number),
    })
  })

  it('crafts and uses a medicinal poultice to restore health', () => {
    const workbenchState = gameWithWorkbench()
    const state = {
      ...workbenchState,
      character: { ...workbenchState.character, level: 2 },
      survival: { ...initialGameState.survival, health: 50 },
      inventory: {
        ...workbenchState.inventory,
        slots: [
          ...workbenchState.inventory.slots,
          { itemId: 'item_wild_herb' as const, quantity: 2 },
          { itemId: 'item_plant_fiber' as const, quantity: 1 },
        ],
      },
    }
    const queued = queueRecipe(state, 'recipe_medicinal_poultice', 1_000)
    if (!queued.ok) throw new Error(queued.message)
    const completed = completeCrafting(queued.state, 17_000)
    expect(completed.status).toBe('completed')
    const treated = consumeItem(completed.state, 'item_medicinal_poultice', 17_000)
    expect(treated.ok).toBe(true)
    if (!treated.ok) throw new Error(treated.message)
    expect(treated.state.survival.health).toBe(62)
  })

  it('makes rope at hand and requires a workbench to craft tools that use it', () => {
    expect(itemDefinitions.item_rope.name).toBe('Dây bện')
    expect(itemDefinitions.item_old_rope.name).toBe('Dây thừng cũ')
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_plant_fiber' as const, quantity: 3 }],
      },
    }
    const rope = queueRecipe(state, 'recipe_rope', 1_000)
    expect(rope.ok).toBe(true)
    if (!rope.ok) throw new Error(rope.message)
    const ropeReady = completeCrafting(rope.state, 9_000)
    expect(ropeReady.state.inventory.slots).toContainEqual({ itemId: 'item_rope', quantity: 1 })
    expect(getRecipeAvailability(ropeReady.state, 'recipe_fishing_rod'))
      .toBe('Cần có bàn chế tạo đã hoàn thành.')
  })

  it('consumes ingredients when queued and grants the output only when the timer completes', () => {
    const state = gameWithWorkbench()
    const queued = queueRecipe(state, 'recipe_wooden_axe', 10_000)
    if (!queued.ok) throw new Error(queued.message)

    expect(queued.state.inventory.slots).toContainEqual({ itemId: 'item_wood', quantity: 1 })
    expect(queued.state.inventory.slots).toContainEqual({ itemId: 'item_stone', quantity: 1 })
    expect(completeCrafting(queued.state, 15_999).status).toBe('pending')

    const completed = completeCrafting(queued.state, 16_000)
    expect(completed.status).toBe('completed')
    expect(completed.state.inventory.slots).toContainEqual({ itemId: 'item_wooden_axe', quantity: 1 })
    expect(completed.state.craftingQueue).toHaveLength(0)
  })

  it('processes softwood into planks through the workbench queue', () => {
    const state = gameWithWorkbench()
    const processingState = {
      ...state,
      inventory: {
        ...state.inventory,
        slots: [...state.inventory.slots, { itemId: 'item_wood_soft' as const, quantity: 3 }],
      },
    }

    const queued = queueRecipe(processingState, 'recipe_wood_plank', 10_000)
    if (!queued.ok) throw new Error(queued.message)

    expect(queued.state.inventory.slots).not.toContainEqual({ itemId: 'item_wood_soft', quantity: 3 })
    expect(completeCrafting(queued.state, 17_999).status).toBe('pending')

    const completed = completeCrafting(queued.state, 18_000)
    expect(completed.status).toBe('completed')
    expect(completed.state.inventory.slots).toContainEqual({ itemId: 'item_wood_plank', quantity: 2 })
    expect(completed.state.character.skillExperience).toMatchObject({ processing: 28 })
  })

  it('sun-dries fruit without a station and keeps the new food in inventory', () => {
    const state = {
      ...initialGameState,
      discoveredIslandIds: [...initialGameState.discoveredIslandIds, 'island_002'],
      inventory: {
        ...initialGameState.inventory,
        slots: [
          ...initialGameState.inventory.slots.filter((slot) => slot.itemId !== 'item_wild_fruit'),
          { itemId: 'item_wild_fruit' as const, quantity: 3 },
        ],
      },
    }

    const queued = queueRecipe(state, 'recipe_dried_fruit', 1_000)
    if (!queued.ok) throw new Error(queued.message)
    const result = completeCrafting(queued.state, 11_000)

    expect(result.status).toBe('completed')
    expect(result.state.inventory.slots).toContainEqual({ itemId: 'item_dried_fruit', quantity: 2 })
  })

  it('unlocks dried fruit after discovering Driftwood Forest Island', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_wild_fruit' as const, quantity: 3 }],
      },
    }

    expect(getRecipeAvailability(state, 'recipe_dried_fruit'))
      .toBe('Cần khám phá Đảo Rừng Dạt để học công thức này.')

    const discoveredState = { ...state, discoveredIslandIds: [...state.discoveredIslandIds, 'island_002'] }
    expect(getRecipeAvailability(discoveredState, 'recipe_dried_fruit')).toBeNull()
  })

  it('crafts a backpack at a completed workbench', () => {
    const state = {
      ...initialGameState,
      character: { ...initialGameState.character, level: 2 },
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_palm_leaf' as const, quantity: 6 },
          { itemId: 'item_plant_fiber' as const, quantity: 8 },
          { itemId: 'item_wood' as const, quantity: 4 },
        ],
      },
      buildings: [{
        id: 'workbench-1',
        definitionId: 'building_workbench',
        islandId: initialGameState.character.currentLocationId,
        level: 1,
        health: 100,
        status: 'completed' as const,
      }],
    }

    expect(getRecipeAvailability(state, 'recipe_backpack')).toBeNull()
    const queued = queueRecipe(state, 'recipe_backpack', 1_000)
    if (!queued.ok) throw new Error(queued.message)
    const completed = completeCrafting(queued.state, 25_000)

    expect(completed.status).toBe('completed')
    if (completed.status !== 'completed') throw new Error('Backpack should be crafted.')
    expect(completed.state.inventory.slots).toContainEqual({ itemId: 'item_backpack', quantity: 1 })
  })
})
