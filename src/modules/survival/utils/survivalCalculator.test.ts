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
      hunger: 15,
      thirst: 0,
      stamina: 100,
    })
  })

  it('scales hunger and thirst to game hours and daily activity needs', () => {
    const stats = { ...initialGameState.survival, hunger: 100, thirst: 100 }

    expect(advanceSurvival(stats, 30 * 60 * 1000)).toMatchObject({ hunger: 65, thirst: 40 })
    expect(advanceSurvival(stats, 30 * 60 * 1000, false, undefined, 1, 1.5))
      .toMatchObject({ hunger: 47.5, thirst: 10 })
    expect(advanceSurvival(stats, 30 * 60 * 1000, false, undefined, 1, 1, false, undefined, 1.2).thirst)
      .toBe(28)
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
      conditions: ['starving', 'dehydrated'],
    })
  })

  it('does not change stats when elapsed time is negative', () => {
    const stats = { ...initialGameState.survival, hunger: 24 }

    expect(advanceSurvival(stats, -1000)).toMatchObject({
      hunger: 24,
      conditions: ['hungry'],
    })

  })

  it('causes damage only while hunger or thirst is empty', () => {
    const stats = { ...initialGameState.survival, hunger: 0, thirst: 0, health: 50 }

    expect(advanceSurvival(stats, 60_000).health).toBe(45.2)
    expect(advanceSurvival({ ...stats, hunger: 1 }, 60_000).health).toBe(46.23)
  })

  it('clamps health to zero after prolonged deprivation', () => {
    const stats = { ...initialGameState.survival, hunger: 0, thirst: 0, health: 1 }

    expect(advanceSurvival(stats, 60 * 60 * 1000).health).toBe(0)
  })

  it('starts deprivation damage only after the remaining need is depleted', () => {
    const stats = { ...initialGameState.survival, hunger: 1, thirst: 100, health: 50 }

    expect(advanceSurvival(stats, 60_000)).toMatchObject({ hunger: 0, health: 49.43 })
  })

  it('slows stamina recovery when hunger, thirst, or health are low', () => {
    const healthy = { ...initialGameState.survival, hunger: 100, thirst: 100, stamina: 20, health: 100 }
    const hungry = { ...healthy, hunger: 20 }
    const dehydrated = { ...healthy, thirst: 20 }

    expect(advanceSurvival(healthy, 60_000, true).stamina).toBe(25)
    expect(advanceSurvival(hungry, 60_000, true).stamina).toBe(22.5)
    expect(advanceSurvival(dehydrated, 60_000, true).stamina).toBe(22.5)
  })

  it('does not recover stamina until rest is explicitly requested', () => {
    const stats = { ...initialGameState.survival, stamina: 20 }
    expect(advanceSurvival(stats, 60_000).stamina).toBe(20)
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
      stamina: 27.5,
      health: 50.03,
    })
  })

  it('increases thirst loss in hot weather', () => {
    const stats = { ...initialGameState.survival, thirst: 100, stamina: 100 }

    expect(advanceSurvival(stats, 60_000, false).thirst).toBe(98)
    expect(advanceSurvival(stats, 60_000, false, getWeatherDefinition('extreme_heat')).thirst).toBe(97)
    expect(advanceSurvival(stats, 60_000, false, getWeatherDefinition('extreme_heat'), 1, 1, true).thirst)
      .toBe(98)
  })

  it('damages health during extreme heat or cold unless protected by shelter', () => {
    const stats = { ...initialGameState.survival, health: 70, hunger: 100, thirst: 100 }

    expect(advanceSurvival(stats, 60_000, false, getWeatherDefinition('extreme_heat')).health)
      .toBe(68.4)
    expect(advanceSurvival(stats, 60_000, false, getWeatherDefinition('extreme_heat'), 1, 1, true).health)
      .toBe(70)
    expect(advanceSurvival(stats, 60_000, false, getWeatherDefinition('blizzard')).health)
      .toBe(68.4)
  })

  it('increases hunger and thirst loss during strenuous activity', () => {
    const stats = { ...initialGameState.survival, hunger: 100, thirst: 100 }

    expect(advanceSurvival(stats, 60_000, false, undefined, 1, 1.5))
      .toMatchObject({ hunger: 98.25, thirst: 97 })
  })

  it('gradually damages health during severe hunger and dehydration before needs reach zero', () => {
    const stats = { ...initialGameState.survival, health: 80, hunger: 10, thirst: 10 }

    expect(advanceSurvival(stats, 60_000, false).health).toBe(78.8)
  })

  it('does not restore a depleted health value while resting', () => {
    const stats = { ...initialGameState.survival, health: 0, hunger: 80, thirst: 80 }

    expect(advanceSurvival(stats, 60 * 60 * 1000, true).health).toBe(0)
  })
})

describe('getSurvivalConditions', () => {
  it('reports hunger and thirst warnings at the configured threshold', () => {
    expect(getSurvivalConditions({
      ...initialGameState.survival,
      hunger: 25,
      thirst: 25,
    })).toEqual(['hungry', 'thirsty'])
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
