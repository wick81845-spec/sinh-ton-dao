import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { researchTechnology, getTechnologyResearchAvailability } from './technologyService'

describe('technologyService', () => {
  it('consumes research materials, records the unlock, and awards skill experience', () => {
    const result = researchTechnology(initialGameState, 'tech_basic_tools')
    if (!result.ok) throw new Error(result.message)

    expect(result.state.character.researchedTechnologyIds).toEqual(['tech_basic_tools'])
    expect(result.state.character.skillExperience).toMatchObject({ processing: 40 })
    expect(result.message).toBe('Đã nghiên cứu Dụng cụ sinh tồn; nhận 40 XP chuyên môn.')
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

  it('researches island settlement using raw materials before the workbench is available', () => {
    const state = {
      ...initialGameState,
      character: {
        ...initialGameState.character,
        level: 2,
        researchedTechnologyIds: ['tech_basic_tools'],
      },
      inventory: {
        ...initialGameState.inventory,
        slots: [
          { itemId: 'item_wood' as const, quantity: 5 },
          { itemId: 'item_stone' as const, quantity: 3 },
        ],
      },
    }

    expect(getTechnologyResearchAvailability(state, 'tech_island_settlement')).toBeNull()
    const result = researchTechnology(state, 'tech_island_settlement')
    if (!result.ok) throw new Error(result.message)

    expect(result.state.character.researchedTechnologyIds)
      .toEqual(['tech_basic_tools', 'tech_island_settlement'])
    expect(result.state.inventory.slots).toEqual([])
  })

  it('does not consume anything if materials are insufficient', () => {
    const state = {
      ...initialGameState,
      inventory: { ...initialGameState.inventory, slots: [] },
    }
    const result = researchTechnology(state, 'tech_basic_tools')

    expect(result).toEqual({ ok: false, message: 'Không đủ tài nguyên trong hành trang hoặc rương đảo nhà để nghiên cứu.' })
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

  it('requires advanced coastal shipbuilding before researching ocean frontier', () => {
    const state = {
      ...initialGameState,
      character: {
        ...initialGameState.character,
        level: 8,
        researchedTechnologyIds: ['tech_seafaring', 'tech_advanced_production'],
      },
      inventory: {
        ...initialGameState.inventory,
        slots: [
          ...initialGameState.inventory.slots,
          { itemId: 'item_charcoal' as const, quantity: 4 },
          { itemId: 'item_wood_plank' as const, quantity: 6 },
        ],
      },
    }

    expect(getTechnologyResearchAvailability(state, 'tech_ocean_frontier'))
      .toBe('Cần nghiên cứu Đóng thuyền ven bờ trước.')

    const readyState = {
      ...state,
      character: {
        ...state.character,
        researchedTechnologyIds: [
          ...state.character.researchedTechnologyIds,
          'tech_seafaring_advanced',
        ],
      },
    }
    expect(getTechnologyResearchAvailability(readyState, 'tech_ocean_frontier')).toBeNull()
  })

  it('rejects unknown technologies', () => {
    expect(getTechnologyResearchAvailability(initialGameState, 'unknown'))
      .toBe('Không tìm thấy công nghệ.')
  })
})
