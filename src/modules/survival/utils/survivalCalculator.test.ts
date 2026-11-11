import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { getWeatherDefinition } from '../../world/data/weatherDefinitions'
import { advanceSurvival, getSurvivalConditions, isSurvivorResting } from './survivalCalculator'

describe('advanceSurvival', () => {
  it('applies configured hunger and thirst decay and stamina recovery', () => {
    const stats = {
      ...initialGameState.survival,
      hunger: 50,
      thirst: 60,
      stamina: 20,
    }

    expect(advanceSurvival(stats, 30 * 60 * 1000, true)).toMatchObject({
      hunger: 32.5,
      thirst: 30,
      stamina: 100,
    })
  })

  it('scales hunger and thirst to game hours and daily activity needs', () => {
    const stats = { ...initialGameState.survival, hunger: 100, thirst: 100 }

    expect(advanceSurvival(stats, 30 * 60 * 1000)).toMatchObject({ hunger: 82.5, thirst: 70 })
    expect(advanceSurvival(stats, 30 * 60 * 1000, false, undefined, 1, 1.5))
      .toMatchObject({ hunger: 73.75, thirst: 55 })
    expect(advanceSurvival(stats, 30 * 60 * 1000, false, undefined, 1, 1, false, undefined, 1.2).thirst)
      .toBe(64)
  })

  it('clamps needs at zero and stamina at its maximum', () => {
    const stats = {
      ...initialGameState.survival,
      hunger: 0.2,
      thirst: 0.4,
      stamina: 100,
    }

    expect(advanceSurvival(stats, 60 * 60 * 1000)).toMatchObject({
      hunger: 0,
      thirst: 0,
      stamina: 100,
      conditions: ['hunger-depleted', 'thirst-depleted'],
    })
  })

  it('does not change stats when elapsed time is negative', () => {
    const stats = { ...initialGameState.survival, hunger: 24 }

    expect(advanceSurvival(stats, -1000)).toMatchObject({
      hunger: 24,
      conditions: ['hunger-danger', 'thirst-rising'],
    })

  })

  it('does not damage health when hunger or thirst is depleted', () => {
    const stats = { ...initialGameState.survival, hunger: 0, thirst: 0, health: 50 }

    expect(advanceSurvival(stats, 60_000).health).toBe(50)
    expect(advanceSurvival({ ...stats, hunger: 1 }, 60_000).health).toBe(50)
  })

  it('slows stamina recovery when hunger, thirst, or health are low', () => {
    const healthy = { ...initialGameState.survival, hunger: 100, thirst: 100, stamina: 20, health: 100 }
    const hungry = { ...healthy, hunger: 20 }
    const dehydrated = { ...healthy, thirst: 20 }

    expect(advanceSurvival(healthy, 60_000, true).stamina).toBe(28)
    expect(advanceSurvival(hungry, 60_000, true).stamina).toBe(24)
    expect(advanceSurvival(dehydrated, 60_000, true).stamina).toBe(24)
  })

  it('does not recover stamina until rest is explicitly requested', () => {
    const stats = { ...initialGameState.survival, stamina: 20 }
    expect(advanceSurvival(stats, 60_000).stamina).toBe(20)
  })

  it('recovers stamina faster when resting at night than during the day', () => {
    const stats = {
      ...initialGameState.survival,
      hunger: 100,
      thirst: 100,
      stamina: 20,
    }

    expect(advanceSurvival(stats, 60_000, true, undefined, 1, 1, false, 1, 1, 1).stamina).toBe(28)
    expect(advanceSurvival(stats, 60_000, true, undefined, 1, 1, false, 1, 1, 1.5).stamina).toBe(32)
    expect(advanceSurvival(stats, 60_000, false, undefined, 1, 1, false, 1, 1, 1.5).stamina).toBe(20)
  })

  it('recovers stamina only while resting and health only when well fed and hydrated', () => {
    const stats = {
      ...initialGameState.survival,
      hunger: 100,
      thirst: 100,
      stamina: 20,
      health: 50,
    }

    expect(advanceSurvival(stats, 60 * 60 * 1000, false, undefined, 1, 1, false, 1))
      .toMatchObject({ stamina: 20, health: 50 })
    expect(advanceSurvival(stats, 60 * 60 * 1000, true, undefined, 1, 1, false, 1))
      .toMatchObject({ stamina: 100, health: 51 })
    expect(advanceSurvival({ ...stats, hunger: 20 }, 60_000, true).health).toBe(50)
  })

  it('improves rest recovery near the starter campfire and inside the leaf shelter', () => {
    const stats = {
      ...initialGameState.survival,
      hunger: 80,
      thirst: 80,
      stamina: 20,
      health: 50,
    }

    expect(advanceSurvival(stats, 60_000, true, undefined, 1.5)).toMatchObject({
      stamina: 32,
      health: 50.03,
    })
  })

  it('increases thirst loss in hot weather', () => {
    const stats = { ...initialGameState.survival, thirst: 100, stamina: 100 }

    expect(advanceSurvival(stats, 60_000, false).thirst).toBe(99)
    expect(advanceSurvival(stats, 60_000, false, getWeatherDefinition('extreme_heat')).thirst).toBe(98.5)
    expect(advanceSurvival(stats, 60_000, false, getWeatherDefinition('extreme_heat'), 1, 1, true).thirst)
      .toBe(99)
  })

  it('does not apply direct health damage from weather alone', () => {
    const stats = { ...initialGameState.survival, health: 70, hunger: 100, thirst: 100 }

    expect(advanceSurvival(stats, 60_000, false, getWeatherDefinition('extreme_heat')).health)
      .toBe(70)
    expect(advanceSurvival(stats, 60_000, false, getWeatherDefinition('extreme_heat'), 1, 1, true).health)
      .toBe(70)
    expect(advanceSurvival(stats, 60_000, false, getWeatherDefinition('blizzard')).health)
      .toBe(70)
  })

  it('increases hunger and thirst loss during strenuous activity', () => {
    const stats = { ...initialGameState.survival, hunger: 100, thirst: 100 }

    expect(advanceSurvival(stats, 60_000, false, undefined, 1, 1.5))
      .toMatchObject({ hunger: 99.13, thirst: 98.5 })
  })

  it('does not damage health during hunger and dehydration stages', () => {
    const stats = { ...initialGameState.survival, health: 80, hunger: 10, thirst: 10 }

    expect(advanceSurvival(stats, 60_000, false).health).toBe(80)
  })

  it('does not restore a depleted health value while resting', () => {
    const stats = { ...initialGameState.survival, health: 0, hunger: 80, thirst: 80 }

    expect(advanceSurvival(stats, 60 * 60 * 1000, true).health).toBe(0)
  })
})

describe('getSurvivalConditions', () => {
  it('reports hunger and thirst stages', () => {
    expect(getSurvivalConditions({
      ...initialGameState.survival,
      hunger: 25,
      thirst: 25,
    })).toEqual(['hunger-danger', 'thirst-danger'])
  })
})

describe('isSurvivorResting', () => {
  it('requires an explicit rest state and no active activities', () => {
    expect(isSurvivorResting(initialGameState)).toBe(false)
    expect(isSurvivorResting({ ...initialGameState, isResting: true })).toBe(true)
    expect(isSurvivorResting({
      ...initialGameState,
      isResting: true,
      activeGathering: { activityId: 'shore-fishing', startedAt: 0, completesAt: 1 },
    })).toBe(false)
    expect(isSurvivorResting({
      ...initialGameState,
      isResting: true,
      voyages: [{
        id: 'voyage-1',
        shipId: 'ship-1',
        originId: 'island_001',
        destinationId: 'island_002',
        status: 'traveling',
        startedAt: 0,
        completesAt: 1,
        arrivedAt: null,
      }],
    })).toBe(false)
    expect(isSurvivorResting({
      ...initialGameState,
      isResting: true,
      craftingQueue: [{
        id: 'crafting-1',
        recipeId: 'recipe_wooden_axe',
        startedAt: 0,
        completesAt: 1,
      }],
    })).toBe(false)
    expect(isSurvivorResting({
      ...initialGameState,
      isResting: true,
      constructionQueue: [{
        id: 'construction-1',
        buildingId: 'building-1',
        kind: 'construction',
        targetLevel: 1,
        startedAt: 0,
        completesAt: 1,
      }],
    })).toBe(false)
  })
})
