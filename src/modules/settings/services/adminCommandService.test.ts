import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { applyAdminCommand } from './adminCommandService'

describe('adminCommandService', () => {
  it('gives and takes items from the selected player container', () => {
    const result = applyAdminCommand(initialGameState, {
      itemTransfers: [
        { action: 'give', container: 'storage', itemId: 'item_rope', quantity: 3 },
        { action: 'take', container: 'inventory', itemId: 'item_wood', quantity: 2 },
      ],
    }, 'admin-command-1', 1_000)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.storage.slots).toEqual([{ itemId: 'item_rope', quantity: 3 }])
    expect(result.state.inventory.slots[0]).toEqual({ itemId: 'item_wood', quantity: 10 })
  })

  it('moves players to a selected island and restores all survival needs', () => {
    const state = {
      ...initialGameState,
      character: { ...initialGameState.character, status: 'dead' as const },
      survival: { ...initialGameState.survival, health: 0, hunger: 0, thirst: 0, stamina: 0, wetness: 90 },
      ailments: [{ id: 'bleeding' as const, elapsedMs: 1_000 }],
      activeGathering: { activityId: 'collect-driftwood', startedAt: 0, completesAt: 10_000 },
    }
    const result = applyAdminCommand(state, {
      restoreAll: true,
      teleportToIslandId: 'island_003',
    }, 'admin-command-2', 1_000)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.character).toMatchObject({ status: 'alive', currentLocationId: 'island_003' })
    expect(result.state.survival).toMatchObject({
      health: 100,
      hunger: 100,
      thirst: 100,
      stamina: 100,
      bodyTemperature: 37,
      wetness: 0,
    })
    expect(result.state.ailments).toEqual([])
    expect(result.state.appliedAdminCommandIds).toContain('admin-command-2')
    expect(result.state.discoveredIslandIds).toContain('island_003')
    expect(result.state.weather?.locationId).toBe('island_003')
    expect(result.state.activeGathering).toBeNull()
  })

  it('rejects item operations atomically if the player lacks the requested amount', () => {
    const result = applyAdminCommand(initialGameState, {
      itemTransfers: [{ action: 'take', container: 'inventory', itemId: 'item_wood', quantity: 99 }],
    }, 'admin-command-3')

    expect(result).toMatchObject({ ok: false, state: initialGameState })
    expect(initialGameState.inventory.slots[0]).toEqual({ itemId: 'item_wood', quantity: 12 })
  })
})
