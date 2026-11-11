import { describe, expect, it } from 'vitest'
import { parseAdminSurvivalCommand } from './adminSurvivalCommand.js'

describe('parseAdminSurvivalCommand', () => {
  it('accepts a dedicated revive command and rejects combining it with stat edits', () => {
    expect(parseAdminSurvivalCommand({ revive: true })).toEqual({ revive: true })
    expect(parseAdminSurvivalCommand({ revive: false })).toBeNull()
    expect(parseAdminSurvivalCommand({ revive: true, health: 100 })).toBeNull()
  })

  it('accepts supported values and empty replacements for illness states', () => {
    expect(parseAdminSurvivalCommand({
      bodyTemperature: 35.5,
      wetness: 80,
      ailments: [],
    })).toEqual({
      bodyTemperature: 35.5,
      wetness: 80,
      ailments: [],
    })
  })

  it('accepts bounded item transfers, island moves, and full restoration', () => {
    expect(parseAdminSurvivalCommand({
      restoreAll: true,
      teleportToIslandId: 'island_003',
      itemTransfers: [
        { action: 'give', container: 'inventory', itemId: 'item_rope', quantity: 2 },
        { action: 'take', container: 'storage', itemId: 'item_wood', quantity: 1 },
      ],
    })).toEqual({
      restoreAll: true,
      teleportToIslandId: 'island_003',
      itemTransfers: [
        { action: 'give', container: 'inventory', itemId: 'item_rope', quantity: 2 },
        { action: 'take', container: 'storage', itemId: 'item_wood', quantity: 1 },
      ],
    })
  })

  it('rejects unknown fields, out-of-range values and duplicate ailments', () => {
    expect(parseAdminSurvivalCommand({ health: 101 })).toBeNull()
    expect(parseAdminSurvivalCommand({ health: 50, role: 'admin' })).toBeNull()
    expect(parseAdminSurvivalCommand({
      ailments: [
        { id: 'bleeding', elapsedMs: 0 },
        { id: 'bleeding', elapsedMs: 1 },
      ],
    })).toBeNull()
    expect(parseAdminSurvivalCommand({ ailments: [{ id: 'unknown', elapsedMs: 0 }] })).toBeNull()
    expect(parseAdminSurvivalCommand({ teleportToIslandId: 'unknown-island' })).toBeNull()
    expect(parseAdminSurvivalCommand({
      itemTransfers: [{ action: 'give', container: 'inventory', itemId: 'not-an-item', quantity: 1 }],
    })).toBeNull()
    expect(parseAdminSurvivalCommand({
      itemTransfers: [{ action: 'take', container: 'storage', itemId: 'item_wood', quantity: 10_000 }],
    })).toBeNull()
  })
})
