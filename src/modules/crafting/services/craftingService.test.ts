import { describe, expect, it } from 'vitest'
import { initialGameState, newPlayerGameState } from '../../../data/mockGameState'
import { completeConstructions, startConstruction } from '../../building/services/buildingService'
import {
  completeCrafting,
  getCraftingPageRecipes,
  getRecipeAvailability,
  getRecipesForStation,
  queueRecipe,
} from './craftingService'
import { researchTechnology } from '../../progression/services/technologyService'
import { consumeItem } from '../../inventory/services/inventoryService'
import { itemDefinitions } from '../../../data/items/itemDefinitions'

function gameWithWorkbench() {
  const preparedState = {
    ...initialGameState,
    character: { ...initialGameState.character, level: 2, experience: 100 },
    inventory: {
      ...initialGameState.inventory,
      slots: [
        ...initialGameState.inventory.slots.filter((slot) => slot.itemId !== 'item_wood' && slot.itemId !== 'item_stone'),
        { itemId: 'item_wood' as const, quantity: 17 },
        { itemId: 'item_stone' as const, quantity: 8 },
        { itemId: 'item_branch' as const, quantity: 5 },
        { itemId: 'item_rope' as const, quantity: 2 },
      ],
    },
  }
  const toolsResearch = researchTechnology(preparedState, 'tech_basic_tools')
  if (!toolsResearch.ok) throw new Error(toolsResearch.message)
  const settlementResearch = researchTechnology(toolsResearch.state, 'tech_island_settlement')
  if (!settlementResearch.ok) throw new Error(settlementResearch.message)
  const construction = startConstruction(settlementResearch.state, 'building_workbench', 1_000)
  if (!construction.ok) throw new Error(construction.message)
  const completed = completeConstructions(construction.state, 7_000).state
  return {
    ...completed,
    inventory: {
      ...completed.inventory,
      slots: completed.inventory.slots.map((slot) => slot.itemId === 'item_wood'
        ? { ...slot, quantity: slot.quantity + 3 }
        : slot),
    },
  }
}

describe('craftingService', () => {
  it('keeps campfire and stove recipes out of the crafting bench list', () => {
    const craftingRecipes = getCraftingPageRecipes()
    const campfireRecipes = getRecipesForStation('building_campfire')
    const stoveRecipes = getRecipesForStation('building_cooking_stove')

    expect(campfireRecipes.map((recipe) => recipe.id)).toContain('recipe_clean_water')
    expect(campfireRecipes.map((recipe) => recipe.id)).toContain('recipe_boil_filtered_water')
    expect(stoveRecipes.map((recipe) => recipe.id)).toContain('recipe_mushroom_soup')
    expect(stoveRecipes.map((recipe) => recipe.id)).toContain('recipe_vegetable_stew')
    expect(craftingRecipes.some((recipe) => recipe.stationId === 'building_campfire')).toBe(false)
    expect(craftingRecipes.some((recipe) => recipe.stationId === 'building_cooking_stove')).toBe(false)
  })

  it('uses distinct materials for the shovel, fishing spear, and wooden spear', () => {
    const recipesById = new Map(getCraftingPageRecipes().map((recipe) => [recipe.id, recipe]))
    const shovel = recipesById.get('recipe_shovel')
    const fishingSpear = recipesById.get('recipe_fishing_spear')
    const woodenSpear = recipesById.get('recipe_wooden_spear')

    expect(shovel?.ingredients).toContainEqual({ itemId: 'item_bark', quantity: 1 })
    expect(fishingSpear?.ingredients).toContainEqual({ itemId: 'item_plant_fiber', quantity: 2 })
    expect(woodenSpear?.ingredients).toContainEqual({ itemId: 'item_rope', quantity: 1 })
    expect(shovel?.stationId).toBeUndefined()
    expect(fishingSpear?.stationId).toBeUndefined()
    expect(woodenSpear?.stationId).toBeUndefined()
    expect(new Set([
      JSON.stringify(shovel?.ingredients),
      JSON.stringify(fishingSpear?.ingredients),
      JSON.stringify(woodenSpear?.ingredients),
    ]).size).toBe(3)
    expect(recipesById.get('recipe_stone_pickaxe')).toMatchObject({
      stationId: 'building_workbench',
      ingredients: [
        { itemId: 'item_rough_stone', quantity: 4 },
        { itemId: 'item_branch', quantity: 2 },
        { itemId: 'item_rope', quantity: 1 },
      ],
    })

    expect(recipesById.get('recipe_clay_brick')).toMatchObject({
      stationId: 'building_kiln',
      ingredients: [
        { itemId: 'item_clay', quantity: 3 },
        { itemId: 'item_charcoal', quantity: 1 },
      ],
      output: { itemId: 'item_clay_brick', quantity: 2 },
    })
    expect(recipesById.get('recipe_iron_ingot')?.ingredients)
      .toEqual([{ itemId: 'item_iron_ore', quantity: 2 }, { itemId: 'item_coal', quantity: 1 }])
    expect(recipesById.get('recipe_copper_ingot')?.ingredients)
      .toEqual([{ itemId: 'item_copper_ore', quantity: 2 }, { itemId: 'item_coal', quantity: 1 }])
    expect(recipesById.get('recipe_bronze_ingot')?.ingredients).toEqual([
      { itemId: 'item_copper_ore', quantity: 1 },
      { itemId: 'item_tin_ore', quantity: 1 },
      { itemId: 'item_coal', quantity: 1 },
    ])
  })

  it('offers craftable clothing for every equipment slot with survival protection', () => {
    const recipesById = new Map(getCraftingPageRecipes().map((recipe) => [recipe.id, recipe]))
    const clothingRecipes = [
      ['recipe_diving_helmet', 'item_diving_helmet', 'head'],
      ['recipe_wool_sweater', 'item_wool_sweater', 'body'],
      ['recipe_reinforced_armor', 'item_reinforced_armor', 'body'],
      ['recipe_gloves', 'item_gloves', 'hands'],
      ['recipe_padded_trousers', 'item_padded_trousers', 'legs'],
      ['recipe_hiking_boots', 'item_hiking_boots', 'feet'],
    ] as const

    clothingRecipes.forEach(([recipeId, itemId, slot]) => {
      expect(recipesById.get(recipeId)?.output.itemId).toBe(itemId)
      expect(itemDefinitions[itemId].clothingSlot).toBe(slot)
      expect(
        (itemDefinitions[itemId].coldProtection ?? 0)
          + (itemDefinitions[itemId].rainProtection ?? 0)
          + (itemDefinitions[itemId].damageReduction ?? 0),
      ).toBeGreaterThan(0)
    })
  })

  it('uses honey for jam and boiled water for mushroom soup', () => {
    const state = {
      ...initialGameState,
      character: {
        ...initialGameState.character,
        level: 2,
        researchedTechnologyIds: ['tech_food_preservation'],
      },
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_wild_fruit' as const, quantity: 3 },
          { itemId: 'item_honey' as const, quantity: 1 },
          { itemId: 'item_wild_mushroom' as const, quantity: 2 },
          { itemId: 'item_clean_water' as const, quantity: 1 },
          { itemId: 'item_pacific_salmon' as const, quantity: 1 },
          { itemId: 'item_seaweed' as const, quantity: 1 },
        ],
      },
      buildings: [{
        id: 'stove-1',
        definitionId: 'building_cooking_stove',
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 140,
        status: 'completed' as const,
      }],
    }

    const jam = queueRecipe(state, 'recipe_fruit_jam', 1_000)
    if (!jam.ok) throw new Error(jam.message)
    const jamReady = completeCrafting(jam.state, 21_000)
    expect(jamReady).toMatchObject({ status: 'completed', itemId: 'item_fruit_jam', quantity: 2 })
    if (jamReady.status !== 'completed') throw new Error('Fruit jam should be crafted.')

    const soup = queueRecipe(jamReady.state, 'recipe_mushroom_soup', 21_000)
    if (!soup.ok) throw new Error(soup.message)
    const soupReady = completeCrafting(soup.state, 33_000)
    expect(soupReady).toMatchObject({ status: 'completed', itemId: 'item_mushroom_soup', quantity: 1 })
    if (soupReady.status !== 'completed') throw new Error('Mushroom soup should be cooked.')

    const sushi = queueRecipe(soupReady.state, 'recipe_fish_sushi', 33_000)
    if (!sushi.ok) throw new Error(sushi.message)
    expect(completeCrafting(sushi.state, 51_000))
      .toMatchObject({ status: 'completed', itemId: 'item_fish_sushi', quantity: 1 })

    const rawWaterOnly = {
      ...state,
      inventory: {
        ...state.inventory,
        slots: [
          { itemId: 'item_wild_mushroom' as const, quantity: 2 },
          { itemId: 'item_fresh_water' as const, quantity: 1 },
        ],
      },
    }
    expect(getRecipeAvailability(rawWaterOnly, 'recipe_mushroom_soup'))
      .toBe('Không đủ nguyên liệu trong túi đồ.')
  })

  it('crystallizes salt from collected seawater at the salt pan', () => {
    const state = {
      ...initialGameState,
      character: {
        ...initialGameState.character,
        level: 2,
        researchedTechnologyIds: ['tech_food_preservation'],
      },
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_seawater' as const, quantity: 3 }],
      },
      buildings: [{
        id: 'salt-pan-1',
        definitionId: 'building_salt_pan',
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 90,
        status: 'completed' as const,
      }],
    }

    const queued = queueRecipe(state, 'recipe_sea_salt', 1_000)
    if (!queued.ok) throw new Error(queued.message)
    expect(completeCrafting(queued.state, 21_000))
      .toMatchObject({ status: 'completed', itemId: 'item_sea_salt', quantity: 1 })
  })

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

  it('allows crafting when inventory is full if consumed ingredients free a slot', () => {
    const fullInventoryState = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        maxSlots: 12,
        slots: [
          { itemId: 'item_wood' as const, quantity: 3 },
          { itemId: 'item_stone' as const, quantity: 2 },
          { itemId: 'item_branch' as const, quantity: 1 },
          { itemId: 'item_bark' as const, quantity: 1 },
          { itemId: 'item_plant_fiber' as const, quantity: 1 },
          { itemId: 'item_clay' as const, quantity: 1 },
          { itemId: 'item_rope' as const, quantity: 1 },
          { itemId: 'item_sea_salt' as const, quantity: 1 },
          { itemId: 'item_copper_ore' as const, quantity: 1 },
          { itemId: 'item_tin_ore' as const, quantity: 1 },
          { itemId: 'item_charcoal' as const, quantity: 1 },
          { itemId: 'item_rough_stone' as const, quantity: 1 },
        ],
      },
    }

    expect(fullInventoryState.inventory.slots.length).toBe(12)
    // Wood and stone will be completely consumed, freeing 2 slots for 1 wooden axe
    expect(getRecipeAvailability(fullInventoryState, 'recipe_wooden_axe')).toBeNull()
    const queued = queueRecipe(fullInventoryState, 'recipe_wooden_axe', 1_000)
    expect(queued.ok).toBe(true)
    if (!queued.ok) throw new Error(queued.message)
    const completed = completeCrafting(queued.state, 8_000)
    expect(completed.status).toBe('completed')
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

  it('boils fresh water at a fueled campfire', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_fresh_water' as const, quantity: 1 },
          { itemId: 'item_branch' as const, quantity: 1 },
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

    expect(getRecipeAvailability(state, 'recipe_clean_water', 1_000)).toBeNull()
    const queued = queueRecipe(state, 'recipe_clean_water', 1_000)
    if (!queued.ok) throw new Error(queued.message)
    expect(completeCrafting(queued.state, 9_000).state.inventory.slots)
      .toContainEqual({ itemId: 'item_clean_water', quantity: 1 })
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

  it('lets a new survivor dry fish on the starter island', () => {
    const state = {
      ...initialGameState,
      character: { ...initialGameState.character, level: 2 },
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_anchovy' as const, quantity: 2 }],
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

    expect(getRecipeAvailability(state, 'recipe_dried_fish', 1_000, 'item_anchovy')).toBeNull()
    const queued = queueRecipe(state, 'recipe_dried_fish', 1_000, 'item_anchovy')
    if (!queued.ok) throw new Error(queued.message)
    expect(queued.state.inventory.slots).not.toContainEqual({ itemId: 'item_anchovy', quantity: 2 })
    const completed = completeCrafting(queued.state, 31_000)
    expect(completed.status).toBe('completed')
    expect(completed.state.inventory.slots).toContainEqual({
      itemId: 'item_dried_fish',
      quantity: 1,
      expiresAt: expect.any(Number),
    })
  })

  it('uses the selected fish species and yield for roasting', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_anchovy' as const, quantity: 1 },
          { itemId: 'item_bluefin_tuna' as const, quantity: 1 },
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

    const queued = queueRecipe(state, 'recipe_roast_fish', 1_000, 'item_bluefin_tuna')
    if (!queued.ok) throw new Error(queued.message)
    expect(queued.state.inventory.slots).toContainEqual({ itemId: 'item_anchovy', quantity: 1 })
    expect(queued.state.craftingQueue[0]).toMatchObject({
      fishItemId: 'item_bluefin_tuna',
      outputQuantity: 8,
    })
    const completed = completeCrafting(queued.state, 11_000)
    expect(completed.status).toBe('completed')
    expect(completed).toMatchObject({ itemId: 'item_cooked_fish', quantity: 8 })
  })

  it('uses the same fish inputs for smoking and salting', () => {
    const smokeState = {
      ...initialGameState,
      character: {
        ...initialGameState.character,
        level: 3,
        researchedTechnologyIds: ['tech_food_preservation'],
      },
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_anchovy' as const, quantity: 2 },
          { itemId: 'item_wood' as const, quantity: 1 },
        ],
      },
      buildings: [{
        id: 'smokehouse-1',
        definitionId: 'building_smokehouse',
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 140,
        status: 'completed' as const,
      }],
    }
    const smoked = queueRecipe(smokeState, 'recipe_smoked_fish', 1_000, 'item_anchovy')
    if (!smoked.ok) throw new Error(smoked.message)
    expect(smoked.state.craftingQueue[0].outputQuantity).toBe(2)
    expect(smoked.state.inventory.slots).toEqual([])

    const saltState = {
      ...smokeState,
      character: { ...smokeState.character, level: 2 },
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_anchovy' as const, quantity: 2 },
          { itemId: 'item_sea_salt' as const, quantity: 1 },
        ],
      },
      buildings: [{
        id: 'workbench-1',
        definitionId: 'building_workbench',
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 100,
        status: 'completed' as const,
      }],
    }
    const salted = queueRecipe(saltState, 'recipe_salted_fish', 1_000, 'item_anchovy')
    if (!salted.ok) throw new Error(salted.message)
    expect(salted.state.craftingQueue[0].outputQuantity).toBe(2)
    expect(salted.state.inventory.slots).toEqual([])
  })

  it('winds plant fiber into a spool before weaving cloth for the composite fishing rod', () => {
    const state = {
      ...initialGameState,
      character: {
        ...initialGameState.character,
        currentLocationId: 'island_002',
        level: 3,
        researchedTechnologyIds: ['tech_island_settlement'],
      },
      discoveredIslandIds: [...initialGameState.discoveredIslandIds, 'island_002'],
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_plant_fiber' as const, quantity: 4 }],
      },
      buildings: [{
        id: 'loom-1',
        definitionId: 'building_weaving_loom',
        islandId: 'island_002',
        level: 1,
        health: 120,
        status: 'completed' as const,
      }],
    }

    const queuedSpool = queueRecipe(state, 'recipe_fiber_spool', 1_000)
    if (!queuedSpool.ok) throw new Error(queuedSpool.message)
    const spooled = completeCrafting(queuedSpool.state, 9_000)
    expect(spooled).toMatchObject({ status: 'completed', itemId: 'item_fiber_spool', quantity: 1 })
    if (spooled.status !== 'completed') throw new Error('Fiber spool should be crafted.')

    const queued = queueRecipe({ ...spooled.state, character: state.character }, 'recipe_woven_cloth', 9_000)
    if (!queued.ok) throw new Error(queued.message)
    const completed = completeCrafting(queued.state, 25_000)
    expect(completed).toMatchObject({ status: 'completed', itemId: 'item_woven_cloth', quantity: 1 })
  })

  it('makes natural adhesive from resin at the workbench', () => {
    const state = {
      ...initialGameState,
      character: {
        ...initialGameState.character,
        level: 3,
        researchedTechnologyIds: ['tech_island_settlement'],
      },
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_tree_resin' as const, quantity: 2 }],
      },
      buildings: [{
        id: 'workbench-1',
        definitionId: 'building_workbench',
        islandId: initialGameState.character.homeIslandId,
        level: 2,
        health: 120,
        status: 'completed' as const,
      }],
    }

    const queued = queueRecipe(state, 'recipe_natural_adhesive', 1_000)
    if (!queued.ok) throw new Error(queued.message)
    expect(completeCrafting(queued.state, 13_000))
      .toMatchObject({ status: 'completed', itemId: 'item_natural_adhesive', quantity: 1 })
  })

  it('smelts steel from iron at the metalworking station', () => {
    const state = {
      ...initialGameState,
      character: {
        ...initialGameState.character,
        currentLocationId: 'island_004',
        level: 6,
        researchedTechnologyIds: ['tech_metalworking'],
      },
      discoveredIslandIds: [...initialGameState.discoveredIslandIds, 'island_004'],
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_iron_ingot' as const, quantity: 2 },
          { itemId: 'item_coal' as const, quantity: 1 },
        ],
      },
      buildings: [{
        id: 'smelter-1',
        definitionId: 'building_smelter',
        islandId: 'island_004',
        level: 1,
        health: 180,
        status: 'completed' as const,
      }],
    }

    expect(getRecipeAvailability(state, 'recipe_steel_ingot')).toBeNull()
    const queued = queueRecipe(state, 'recipe_steel_ingot', 1_000)
    if (!queued.ok) throw new Error(queued.message)
    expect(completeCrafting(queued.state, 31_000))
      .toMatchObject({ status: 'completed', itemId: 'item_steel_ingot', quantity: 1 })
  })

  it('blocks fish that need safe preparation and uses species-specific inventory weights', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_lionfish' as const, quantity: 1 }],
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

    expect(getRecipeAvailability(state, 'recipe_roast_fish', 1_000, 'item_lionfish'))
      .toContain('cần được sơ chế an toàn')
    expect(itemDefinitions.item_anchovy.weight).toBe(0.03)
    expect(itemDefinitions.item_bluefin_tuna.weight).toBe(250)
  })

  it('crafts and uses a medicinal poultice to restore health', () => {
    const state = {
      ...initialGameState,
      character: { ...initialGameState.character, level: 2 },
      survival: { ...initialGameState.survival, health: 50 },
      inventory: {
        ...initialGameState.inventory,
        slots: [
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

  it('makes rope and the starter fishing rod by hand', () => {
    expect(itemDefinitions.item_rope.name).toBe('Dây bện')
    expect(itemDefinitions.item_old_rope.name).toBe('Dây thừng cũ')
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_plant_fiber' as const, quantity: 3 },
          { itemId: 'item_branch' as const, quantity: 3 },
        ],
      },
    }
    const rope = queueRecipe(state, 'recipe_rope', 1_000)
    expect(rope.ok).toBe(true)
    if (!rope.ok) throw new Error(rope.message)
    const ropeReady = completeCrafting(rope.state, 9_000)
    expect(ropeReady.state.inventory.slots).toContainEqual({ itemId: 'item_rope', quantity: 1 })
    expect(getRecipeAvailability(ropeReady.state, 'recipe_fishing_rod')).toBeNull()
    const rod = queueRecipe(ropeReady.state, 'recipe_fishing_rod', 9_000)
    if (!rod.ok) throw new Error(rod.message)
    expect(completeCrafting(rod.state, 21_000))
      .toMatchObject({ status: 'completed', itemId: 'item_fishing_rod', quantity: 1 })
  })

  it('reuses old rope with plant fiber to make usable rope', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_old_rope' as const, quantity: 1 },
          { itemId: 'item_plant_fiber' as const, quantity: 1 },
        ],
      },
    }
    const queued = queueRecipe(state, 'recipe_reused_rope', 1_000)
    if (!queued.ok) throw new Error(queued.message)

    const completed = completeCrafting(queued.state, 9_000)
    expect(completed).toMatchObject({ status: 'completed', itemId: 'item_rope', quantity: 1 })
    expect(completed.state.inventory.slots).toContainEqual({ itemId: 'item_rope', quantity: 1 })
    expect(completed.state.inventory.slots.some((slot) => slot.itemId === 'item_old_rope')).toBe(false)
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
    expect(completed.state.character.skillExperience).toMatchObject({ processing: 56 })
  })

  it('sun-dries fruit on the drying rack and keeps the new food in inventory', () => {
    const state = {
      ...initialGameState,
      discoveredIslandIds: [...initialGameState.discoveredIslandIds, 'island_002'],
      buildings: [{
        id: 'drying-rack-1',
        definitionId: 'building_drying_rack',
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 100,
        status: 'completed' as const,
      }],
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

  it('requires a drying rack to preserve fruit on the starter island', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [{ itemId: 'item_wild_fruit' as const, quantity: 3 }],
      },
    }

    expect(getRecipeAvailability(state, 'recipe_dried_fruit'))
      .toBe('Cần có giàn phơi thực phẩm đã hoàn thành.')

    const stateWithRack = {
      ...state,
      buildings: [{
        id: 'drying-rack-1',
        definitionId: 'building_drying_rack' as const,
        islandId: initialGameState.character.homeIslandId,
        level: 1,
        health: 100,
        status: 'completed' as const,
      }],
    }
    expect(getRecipeAvailability(stateWithRack, 'recipe_dried_fruit')).toBeNull()
  })

  it('crafts a backpack by hand from starter-island materials', () => {
    const state = {
      ...initialGameState,
      character: { ...initialGameState.character, level: 1 },
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_palm_leaf' as const, quantity: 6 },
          { itemId: 'item_plant_fiber' as const, quantity: 8 },
          { itemId: 'item_wood' as const, quantity: 4 },
        ],
      },
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
