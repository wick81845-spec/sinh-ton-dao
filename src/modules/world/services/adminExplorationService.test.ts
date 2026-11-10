import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { visitIslandAsAdmin } from './adminExplorationService'

describe('adminExplorationService', () => {
  it('rejects island travel for non-admin players', () => {
    const result = visitIslandAsAdmin(initialGameState, 'island_002', false, 1_000)

    expect(result).toEqual({ ok: false, message: 'Bạn không có quyền sử dụng chế độ quản trị.' })
  })

  it('lets admins unlock and visit an island without normal voyage requirements', () => {
    const result = visitIslandAsAdmin(initialGameState, 'island_012', true, 1_000)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.message)
    expect(result.state.character.currentLocationId).toBe('island_012')
    expect(result.state.discoveredIslandIds).toContain('island_012')
    expect(result.state.weather?.locationId).toBe('island_012')
  })
})
