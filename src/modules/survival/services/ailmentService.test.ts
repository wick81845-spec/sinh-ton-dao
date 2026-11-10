import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { getWeatherDefinition } from '../../world/data/weatherDefinitions'
import { advanceAilments, inflictCombatWound, inflictPoisoning } from './ailmentService'

describe('ailmentService', () => {
  it('adds only one bleeding injury from combat', () => {
    const wounded = inflictCombatWound(initialGameState)

    expect(wounded.ailments).toEqual([{ id: 'bleeding', elapsedMs: 0 }])
    expect(inflictCombatWound(wounded)).toBe(wounded)
  })

  it('applies bleeding damage and advances the injury timer', () => {
    const result = advanceAilments({
      ...initialGameState,
      ailments: [{ id: 'bleeding', elapsedMs: 0 }],
    }, 60 * 1000)

    expect(result.changed).toBe(false)
    expect(result.state.ailments).toEqual([{ id: 'bleeding', elapsedMs: 60 * 1000 }])
    expect(result.state.survival.health).toBe(99.7)
  })

  it('starts an infection after three minutes and accrues time beyond the threshold', () => {
    const result = advanceAilments({
      ...initialGameState,
      ailments: [{ id: 'bleeding', elapsedMs: 0 }],
    }, 4 * 60 * 1000)

    expect(result.state.ailments).toEqual([
      { id: 'bleeding', elapsedMs: 4 * 60 * 1000 },
      { id: 'infection', elapsedMs: 60 * 1000 },
    ])
    expect(result.changed).toBe(true)
    expect(result.state.survival.health).toBe(98.7)
  })

  it('ends bleeding after five minutes while retaining an infection', () => {
    const result = advanceAilments({
      ...initialGameState,
      ailments: [{ id: 'bleeding', elapsedMs: 4 * 60 * 1000 }],
    }, 60 * 1000)

    expect(result.state.ailments).toEqual([{ id: 'infection', elapsedMs: 2 * 60 * 1000 }])
    expect(result.changed).toBe(true)
    expect(result.state.survival.health).toBe(99.6)
  })

  it('does not change state when no elapsed time or ailments are present', () => {
    expect(advanceAilments(initialGameState, 60 * 1000)).toEqual({
      state: initialGameState,
      changed: false,
    })
    expect(advanceAilments({
      ...initialGameState,
      ailments: [{ id: 'bleeding', elapsedMs: 0 }],
    }, 0)).toEqual({
      state: { ...initialGameState, ailments: [{ id: 'bleeding', elapsedMs: 0 }] },
      changed: false,
    })
  })

  it('tracks extreme heat exposure, causes heatstroke after ten minutes, and cools down under shelter', () => {
    const heat = getWeatherDefinition('extreme_heat')
    const first = advanceAilments(initialGameState, 9 * 60 * 1000, heat)
    expect(first.state.ailments).toEqual([
      { id: 'heatstroke', elapsedMs: 9 * 60 * 1000 },
      { id: 'sunburn', elapsedMs: 0, severity: 'mild' },
    ])
    expect(first.state.survival.health).toBe(100)

    const onset = advanceAilments(first.state, 2 * 60 * 1000, heat)
    expect(onset.changed).toBe(true)
    expect(onset.state.ailments).toEqual([
      { id: 'heatstroke', elapsedMs: 11 * 60 * 1000 },
      { id: 'sunburn', elapsedMs: 2 * 60 * 1000, severity: 'mild' },
    ])
    expect(onset.state.survival.health).toBe(99.85)

    const cooling = advanceAilments(onset.state, 6 * 60 * 1000, heat, true)
    expect(cooling.state.ailments).toEqual([])
    const recovered = advanceAilments(cooling.state, 1, heat, true)
    expect(recovered.state.ailments).toEqual([])
  })

  it('tracks severe cold and deals damage only after the exposure threshold', () => {
    const cold = getWeatherDefinition('blizzard')
    const result = advanceAilments(initialGameState, 12 * 60 * 1000, cold)
    expect(result.state.ailments).toEqual([{ id: 'hypothermia', elapsedMs: 12 * 60 * 1000 }])
    expect(result.state.survival.health).toBe(99.8)
  })

  it('recovers from hypothermia near a lit campfire', () => {
    const chilled = {
      ...initialGameState,
      ailments: [{ id: 'hypothermia' as const, elapsedMs: 8 * 60 * 1000 }],
    }

    const warmed = advanceAilments(chilled, 2 * 60 * 1000, getWeatherDefinition('blizzard'), false, true)

    expect(warmed.state.ailments).toEqual([{ id: 'hypothermia', elapsedMs: 4 * 60 * 1000 }])
    expect(warmed.state.survival.health).toBe(100)
  })

  it('inflicts poisoning once and applies damage until the condition resolves', () => {
    const poisoned = inflictPoisoning(initialGameState)
    expect(poisoned.ailments).toEqual([{ id: 'poisoning', elapsedMs: 0 }])
    expect(inflictPoisoning(poisoned)).toBe(poisoned)

    const damage = advanceAilments(poisoned, 60 * 1000)
    expect(damage.state.survival.health).toBe(99.8)
    const resolved = advanceAilments(poisoned, 20 * 60 * 1000)
    expect(resolved.state.ailments).toEqual([])
    expect(resolved.changed).toBe(true)
  })

  it('adds dehydration and exhaustion when survival needs reach a critical level', () => {
    const result = advanceAilments({
      ...initialGameState,
      survival: { ...initialGameState.survival, thirst: 10, stamina: 10 },
    }, 1)

    expect(result.state.ailments?.map((ailment) => ailment.id)).toEqual(['dehydration', 'exhaustion'])
    expect(result.changed).toBe(true)
  })
})
