import { describe, expect, it } from 'vitest'
import { initialGameState, newPlayerGameState } from '../../../data/mockGameState'
import { completeConstructions, startConstruction } from '../../building/services/buildingService'
import { completeCrafting, getRecipeAvailability, queueRecipe } from './craftingService'
import { researchTechnology } from '../../progression/services/technologyService'

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
      character: { ...initialGameState.character, researchedTechnologyIds: ['tech_seafaring'] },
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
})
