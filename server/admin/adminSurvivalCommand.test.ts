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
  })
})
