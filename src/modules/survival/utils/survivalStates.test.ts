import { describe, expect, it } from 'vitest'
import { getNeedState, getStaminaState, getSurvivalMeterStatus } from './survivalStates'

describe('survivalStates', () => {
  it('uses the agreed hunger and thirst bands', () => {
    expect([100, 80, 79, 60, 59, 40, 39, 20, 19, 1, 0].map(getNeedState)).toEqual([
      'normal',
      'normal',
      'rising',
      'rising',
      'deficit',
      'deficit',
      'danger',
      'danger',
      'critical',
      'critical',
      'depleted',
    ])
  })

  it('uses the agreed stamina bands', () => {
    expect([100, 80, 79, 60, 59, 40, 39, 20, 19, 1, 0].map(getStaminaState)).toEqual([
      'normal',
      'normal',
      'slightly-tired',
      'slightly-tired',
      'tired',
      'tired',
      'mild-exhaustion',
      'mild-exhaustion',
      'severe-exhaustion',
      'severe-exhaustion',
      'depleted',
    ])
  })

  it('provides shared localized meter statuses', () => {
    expect(getSurvivalMeterStatus('hunger', 0)).toBe('Suy kiệt')
    expect(getSurvivalMeterStatus('thirst', 30)).toBe('Nguy hiểm')
    expect(getSurvivalMeterStatus('stamina', 0)).toBe('Cạn thể lực')
    expect(getSurvivalMeterStatus('health', 0)).toBe('Đã tử vong')
  })
})
