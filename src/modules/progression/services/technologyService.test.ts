import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { researchTechnology, getTechnologyResearchAvailability } from './technologyService'

describe('technologyService', () => {
  it('consumes research materials, records the unlock, and awards skill experience', () => {
    const result = researchTechnology(initialGameState, 'tech_basic_tools')
    if (!result.ok) throw new Error(result.message)

    expect(result.state.character.researchedTechnologyIds).toEqual(['tech_basic_tools'])
    expect(result.state.character.skillExperience).toMatchObject({ processing: 20 })
    expect(result.state.inventory.slots).toEqual([
      { itemId: 'item_wood', quantity: 9 },
      { itemId: 'item_stone', quantity: 6 },
      { itemId: 'item_wild_fruit', quantity: 5 },
    ])
    expect(getTechnologyResearchAvailability(result.state, 'tech_basic_tools'))
      .toBe('Công nghệ này đã được nghiên cứu.')
  })

  it('requires its prerequisite and required level', () => {
    const state = {
      ...initialGameState,
      character: { ...initialGameState.character, level: 2 },
    }
    expect(getTechnologyResearchAvailability(state, 'tech_island_settlement'))
      .toBe('Cần nghiên cứu Dụng cụ sinh tồn trước.')
  })

  it('does not consume anything if materials are insufficient', () => {
    const state = {
      ...initialGameState,
      inventory: { ...initialGameState.inventory, slots: [] },
    }
    const result = researchTechnology(state, 'tech_basic_tools')

    expect(result).toEqual({ ok: false, message: 'Không đủ tài nguyên trong túi đồ để nghiên cứu.' })
    expect(state.inventory.slots).toEqual([])
    expect(state.character.researchedTechnologyIds).toEqual([])
  })

  it('uses the home storage when carried materials are insufficient', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_wood' as const, quantity: 1 },
          { itemId: 'item_stone' as const, quantity: 1 },
        ],
      },
      storage: {
        ...initialGameState.storage,
        slots: [
          { itemId: 'item_wood' as const, quantity: 2 },
          { itemId: 'item_stone' as const, quantity: 1 },
        ],
      },
    }
    const result = researchTechnology(state, 'tech_basic_tools')
    if (!result.ok) throw new Error(result.message)

    expect(result.state.inventory.slots).toEqual([])
    expect(result.state.storage.slots).toEqual([])
  })

  it('rejects unknown technologies', () => {
    expect(getTechnologyResearchAvailability(initialGameState, 'unknown'))
      .toBe('Không tìm thấy công nghệ.')
  })
})
