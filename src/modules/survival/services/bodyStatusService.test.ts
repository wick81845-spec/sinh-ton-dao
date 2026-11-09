import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { getBodyStatusEffects } from './bodyStatusService'
import { getWeatherDefinition } from '../../world/data/weatherDefinitions'

describe('bodyStatusService', () => {
  it('derives hunger, thirst and exhaustion effects from survival stats', () => {
    const effects = getBodyStatusEffects({
      ...initialGameState.survival,
      hunger: 0,
      thirst: 18,
      stamina: 15,
      health: 20,
    })

    expect(effects.map(({ id, severity }) => [id, severity])).toEqual([
      ['starving', 'severe'],
      ['thirsty', 'mild'],
      ['exhausted', 'moderate'],
      ['critical-health', 'severe'],
    ])
    expect(effects[0].impact).toContain('2 sức khỏe')
  })

  it('shows positive appearance states when survival stats are healthy and resting', () => {
    const effects = getBodyStatusEffects({
      ...initialGameState.survival,
      health: 100,
      hunger: 80,
      thirst: 90,
      stamina: 85,
    })

    expect(effects.map((effect) => effect.id)).toEqual([
      'well-fed',
      'hydrated',
      'vigorous',
      'healthy',
      'recovering',
    ])
    expect(effects.every((effect) => effect.severity === 'positive')).toBe(true)
  })

  it('shows no body effects in normal-range mid stats', () => {
    expect(getBodyStatusEffects({
      ...initialGameState.survival,
      health: 70,
      hunger: 60,
      thirst: 55,
      stamina: 50,
    }).map((effect) => effect.id)).toEqual(['recovering'])
  })

  it('adds visible heat, cold, and rain appearances from the active weather', () => {
    const stats = initialGameState.survival
    expect(getBodyStatusEffects(stats, getWeatherDefinition('extreme_heat')).map((effect) => effect.id))
      .toContain('overheated')
    expect(getBodyStatusEffects(stats, getWeatherDefinition('blizzard')).map((effect) => effect.id))
      .toContain('cold-weather')
    expect(getBodyStatusEffects(stats, getWeatherDefinition('heavy_rain')).map((effect) => effect.id))
      .toContain('rain-wet')
  })

  it('shows recovery only when resting with stable food and water needs', () => {
    const stats = {
      ...initialGameState.survival,
      hunger: 80,
      thirst: 80,
      stamina: 50,
    }

    expect(getBodyStatusEffects(stats, undefined, true).map((effect) => effect.id)).toContain('recovering')
    expect(getBodyStatusEffects(stats, undefined, false).map((effect) => effect.id)).not.toContain('recovering')
    expect(getBodyStatusEffects({ ...stats, thirst: 20 }, undefined, true).map((effect) => effect.id))
      .not.toContain('recovering')
  })

  it('requires stable needs and rest before showing the vigorous effect', () => {
    const stats = {
      ...initialGameState.survival,
      hunger: 20,
      thirst: 80,
      stamina: 90,
    }

    expect(getBodyStatusEffects(stats).map((effect) => effect.id)).not.toContain('vigorous')
    expect(getBodyStatusEffects({ ...stats, hunger: 80 }, undefined, false).map((effect) => effect.id))
      .not.toContain('vigorous')
  })
})
