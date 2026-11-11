import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { getBodyStatusEffects } from './bodyStatusService'
import { getWeatherDefinition } from '../../world/data/weatherDefinitions'

describe('bodyStatusService', () => {
  it('derives hunger, thirst and stamina stages without describing direct health damage', () => {
    const effects = getBodyStatusEffects({
      ...initialGameState.survival,
      hunger: 0,
      thirst: 18,
      stamina: 15,
      health: 20,
    })

    expect(effects.map(({ id, severity }) => [id, severity])).toEqual([
      ['starving', 'severe'],
      ['thirst-critical', 'severe'],
      ['severely-exhausted', 'severe'],
      ['critical-health', 'severe'],
    ])
    expect(effects[0].impact).not.toContain('sức khỏe')
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

  it('shows the shared needs and stamina states in the middle bands', () => {
    expect(getBodyStatusEffects({
      ...initialGameState.survival,
      health: 70,
      hunger: 60,
      thirst: 60,
      stamina: 50,
    }).map((effect) => effect.id)).toEqual([
      'hunger-rising',
      'thirst-rising',
      'tired',
    ])
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

  it('shows shelter protection instead of exposed weather effects', () => {
    const effects = getBodyStatusEffects(
      initialGameState.survival,
      getWeatherDefinition('extreme_heat'),
      true,
      2,
    )
    expect(effects.map((effect) => effect.id)).toContain('sheltered')
    expect(effects.map((effect) => effect.id)).not.toContain('overheated')
    expect(effects.find((effect) => effect.id === 'sheltered')?.impact).toContain('40%')
  })

  it('shows weather ailments and distinguishes early exposure from illness', () => {
    const warmingUp = getBodyStatusEffects(initialGameState.survival, undefined, true, 0, [
      { id: 'heatstroke', elapsedMs: 5 * 60 * 1000 },
    ])
    expect(warmingUp.find((effect) => effect.id === 'heatstroke')?.name).toBe('Nguy cơ say nắng')

    const ill = getBodyStatusEffects(initialGameState.survival, undefined, true, 0, [
      { id: 'hypothermia', elapsedMs: 11 * 60 * 1000 },
      { id: 'poisoning', elapsedMs: 60_000 },
    ])
    expect(ill.map((effect) => effect.id)).toContain('poisoning')
    expect(ill.find((effect) => effect.id === 'hypothermia')?.name).toBe('Hạ thân nhiệt')
  })

  it('shows accumulated wetness and body-temperature effects', () => {
    const effects = getBodyStatusEffects({
      ...initialGameState.survival,
      bodyTemperature: 34.5,
      wetness: 75,
    })

    expect(effects.map((effect) => effect.id)).toContain('body-temperature')
    expect(effects.find((effect) => effect.id === 'wet-clothes')?.name).toBe('Quần áo ướt đẫm')
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
