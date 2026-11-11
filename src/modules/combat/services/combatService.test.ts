import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { attackCombat, getCombatAvailability, respawnCharacter, startCombat } from './combatService'

describe('combatService', () => {
  it('blocks starting and continuing combat at zero stamina', () => {
    const depleted = {
      ...initialGameState,
      survival: { ...initialGameState.survival, stamina: 0 },
    }

    expect(getCombatAvailability(depleted, 'encounter_pirate_patrol'))
      .toContain('cạn thể lực')
    expect(startCombat(depleted, 'encounter_pirate_patrol', 1_000).ok).toBe(false)

    const started = startCombat(initialGameState, 'encounter_pirate_patrol', 1_000)
    if (!started.ok) throw new Error(started.message)
    const exhaustedBattle = {
      ...started.state,
      survival: { ...started.state.survival, stamina: 0 },
    }
    expect(attackCombat(exhaustedBattle, 2_000)).toMatchObject({
      ok: false,
      message: 'Bạn đã cạn thể lực; hãy rút lui và nghỉ ngơi.',
    })
  })

  it('uses the crafted axe to win and records battle loot', () => {
    const state = {
      ...initialGameState,
      inventory: {
        ...initialGameState.inventory,
        slots: [...initialGameState.inventory.slots, { itemId: 'item_wooden_axe' as const, quantity: 1 }],
      },
    }
    const started = startCombat(state, 'encounter_pirate_patrol', 1_000)
    if (!started.ok) throw new Error(started.message)
    const firstTurn = attackCombat(started.state, 2_000)
    if (!firstTurn.ok) throw new Error(firstTurn.message)
    expect(firstTurn.state.survival.health).toBe(89)
    expect(firstTurn.state.ailments).toEqual([{ id: 'bleeding', elapsedMs: 0 }])
    const result = attackCombat(firstTurn.state, 3_000)
    if (!result.ok) throw new Error(result.message)

    expect(result.state.activeCombat).toBeNull()
    expect(result.state.itemDurability?.item_wooden_axe).toBe(18)
    expect(result.state.inventory.slots).toContainEqual({ itemId: 'item_wood', quantity: 15 })
    expect(result.state.combatLog[0]).toMatchObject({
      outcome: 'victory',
      rounds: 2,
      loot: [
        { itemId: 'item_wood', quantity: 3 },
        { itemId: 'item_wild_fruit', quantity: 1 },
      ],
    })

  })

  it('removes the wooden axe after it loses its final durability point', () => {
    const state = {
      ...initialGameState,
      itemDurability: { item_wooden_axe: 1 },
      inventory: {
        ...initialGameState.inventory,
        slots: [...initialGameState.inventory.slots, { itemId: 'item_wooden_axe' as const, quantity: 1 }],
      },
    }
    const started = startCombat(state, 'encounter_pirate_patrol', 1_000)
    if (!started.ok) throw new Error(started.message)
    const result = attackCombat(started.state, 2_000)
    if (!result.ok) throw new Error(result.message)

    expect(result.state.inventory.slots.some((slot) => slot.itemId === 'item_wooden_axe')).toBe(false)
    expect(result.state.itemDurability?.item_wooden_axe).toBeUndefined()
    expect(result.message).toContain('Rìu gỗ đã hỏng')
  })

  it('uses and wears a separately equipped spear in combat', () => {
    const state = {
      ...initialGameState,
      equippedWeaponId: 'item_wooden_spear' as const,
      itemDurability: { item_wooden_spear: 15 },
    }
    const started = startCombat(state, 'encounter_pirate_patrol', 1_000)
    if (!started.ok) throw new Error(started.message)
    const result = attackCombat(started.state, 2_000)
    if (!result.ok) throw new Error(result.message)

    expect(result.state.activeCombat?.opponentHealth).toBe(8)
    expect(result.state.itemDurability?.item_wooden_spear).toBe(14)
    expect(result.state.equippedWeaponId).toBe('item_wooden_spear')
  })

  it('reduces incoming combat damage while reinforced armor is equipped', () => {
    const state = {
      ...initialGameState,
      equippedClothing: { body: 'item_reinforced_armor' as const },
    }
    const started = startCombat(state, 'encounter_pirate_patrol', 1_000)
    if (!started.ok) throw new Error(started.message)
    const result = attackCombat(started.state, 2_000)
    if (!result.ok) throw new Error(result.message)

    expect(result.state.survival.health).toBe(91)
  })

  it('does not use or wear an equipped tool as a combat weapon', () => {
    const state = {
      ...initialGameState,
      equippedWeaponId: 'item_fishing_rod' as const,
      itemDurability: { item_fishing_rod: 12 },
    }
    const started = startCombat(state, 'encounter_pirate_patrol', 1_000)
    if (!started.ok) throw new Error(started.message)
    const result = attackCombat(started.state, 2_000)
    if (!result.ok) throw new Error(result.message)

    expect(result.state.activeCombat?.opponentHealth).toBe(16)
    expect(result.state.itemDurability?.item_fishing_rod).toBe(12)
    expect(result.state.equippedWeaponId).toBe('item_fishing_rod')
  })

  it('drops all carried items on death but preserves storage, then respawns at home', () => {
    const battleState = {
      ...initialGameState,
      survival: { ...initialGameState.survival, health: 11 },
    }
    expect(getCombatAvailability(battleState, 'encounter_pirate_patrol')).toBeNull()
    const started = startCombat(battleState, 'encounter_pirate_patrol', 1_000)
    if (!started.ok) throw new Error(started.message)
    const result = attackCombat(started.state, 2_000)
    if (!result.ok) throw new Error(result.message)

    expect(result.state.character.status).toBe('dead')
    expect(result.state.inventory.slots).toHaveLength(0)
    expect(result.state.storage).toEqual(initialGameState.storage)
    expect(result.state.combatLog[0].droppedItems).toEqual(initialGameState.inventory.slots)

    const respawn = respawnCharacter(result.state)
    if (!respawn.ok) throw new Error(respawn.message)
    expect(respawn.state.character).toMatchObject({ status: 'alive', currentLocationId: initialGameState.character.homeIslandId })
    expect(respawn.state.survival.health).toBe(60)
    expect(respawn.state.ailments).toEqual([])
    expect(respawn.state.storage).toEqual(initialGameState.storage)
    expect(respawn.state.inventory.slots).toHaveLength(0)
  })
})
