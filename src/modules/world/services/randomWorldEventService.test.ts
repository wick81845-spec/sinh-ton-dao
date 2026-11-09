import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { isValidGameSnapshot } from '../../../services/persistence/gameSaveService'
import type { RandomWorldEventRecord } from '../../../shared/types/game'
import { randomWorldEventDefinitions } from '../data/randomWorldEventDefinitions'
import {
  advanceRandomWorldEvents,
  RANDOM_WORLD_EVENT_INTERVAL_MS,
  resolveRandomWorldEvent,
} from './randomWorldEventService'

describe('randomWorldEventService', () => {
  it('schedules and spawns one eligible event deterministically', () => {
    const initialized = advanceRandomWorldEvents(initialGameState, 1_000)
    expect(initialized).toMatchObject({
      changed: true,
      state: {
        nextRandomWorldEventAt: 1_801_000,
        randomWorldEvents: [],
        randomWorldEventScheduleVersion: 2,
      },
    })

    const beforeDue = advanceRandomWorldEvents(initialized.state, 1_800_999)
    expect(beforeDue.changed).toBe(false)
    const spawned = advanceRandomWorldEvents(initialized.state, 1_801_000)
    expect(spawned.changed).toBe(true)
    expect(spawned.spawned).toMatchObject({
      locationId: initialGameState.character.currentLocationId,
      status: 'pending',
      choiceId: null,
    })
    expect(spawned.state.randomWorldEvents).toHaveLength(1)
    expect(spawned.state.nextRandomWorldEventAt).toBe(1_801_000 + RANDOM_WORLD_EVENT_INTERVAL_MS)
  })

  it('uses a per-character event pool and filters weather, location, level, and ship requirements', () => {
    const filteredState = {
      ...initialGameState,
      weather: { weatherId: 'sunny', locationId: 'island_001', changedAt: 0, changesAt: 300_000 },
    }

    for (let slot = 1; slot <= 80; slot += 1) {
      const now = slot * RANDOM_WORLD_EVENT_INTERVAL_MS
      const result = advanceRandomWorldEvents({ ...filteredState, nextRandomWorldEventAt: now }, now)
      expect(result.spawned?.eventId).not.toMatch(/hidden_cove|pirate_patrol|fog_signal|merchant_convoy/)
    }
    expect(randomWorldEventDefinitions.every((event) => event.scope === 'local')).toBe(true)
  })

  it('does not spawn another event while the current encounter is pending', () => {
    const pending: RandomWorldEventRecord = {
      id: 'random-1',
      eventId: 'drifting_crate',
      locationId: 'island_001',
      spawnedAt: 1_000,
      expiresAt: 181_000,
      status: 'pending',
      choiceId: null,
      outcome: null,
      followUpEventId: null,
      followUpAt: null,
    }
    const state = { ...initialGameState, randomWorldEvents: [pending], nextRandomWorldEventAt: 2_000 }

    expect(advanceRandomWorldEvents(state, 90_000)).toMatchObject({ changed: false, state })
    expect(advanceRandomWorldEvents(state, pending.expiresAt).state.randomWorldEvents?.[0].status).toBe('expired')
  })

  it('applies rescue costs, rewards, reputation, and schedules a continuous NPC follow-up', () => {
    const pending: RandomWorldEventRecord = {
      id: 'rescue-1',
      eventId: 'injured_sailor',
      locationId: 'island_001',
      spawnedAt: 1_000,
      expiresAt: 181_000,
      status: 'pending',
      choiceId: null,
      outcome: null,
      followUpEventId: null,
      followUpAt: null,
    }
    const state = { ...initialGameState, randomWorldEvents: [pending] }
    const result = resolveRandomWorldEvent(state, pending.id, 'rescue', 10_000)

    expect(result.ok).toBe(true)
    expect(result.state?.character).toMatchObject({ reputation: 58, coins: 33 })
    expect(result.state?.inventory.slots).not.toContainEqual({ itemId: 'item_wild_fruit', quantity: 5 })
    expect(result.state?.inventory.slots).toContainEqual({ itemId: 'item_wild_fruit', quantity: 3 })
    expect(result.message).toContain('Đã dùng Quả dại × 2')
    expect(result.message).toContain('Nhận 8 xu')
    expect(result.message).toContain('Danh tiếng +8')
    expect(result.state?.randomWorldEvents?.[0]).toMatchObject({
      status: 'resolved',
      choiceId: 'rescue',
      followUpEventId: 'sailor_returns',
      followUpAt: 10_000 + RANDOM_WORLD_EVENT_INTERVAL_MS,
    })

    expect(result.state?.randomWorldEvents?.[0].followUpAt).toBe(10_000 + RANDOM_WORLD_EVENT_INTERVAL_MS)
    expect(result.state?.nextRandomWorldEventAt).toBe(10_000 + RANDOM_WORLD_EVENT_INTERVAL_MS)
    const followUp = advanceRandomWorldEvents(result.state!, 10_000 + RANDOM_WORLD_EVENT_INTERVAL_MS)
    expect(followUp.spawned?.eventId).toBe('sailor_returns')
  })

  it('applies hidden harmful outcomes only after the player chooses', () => {
    const pending: RandomWorldEventRecord = {
      id: 'toxic-fish',
      eventId: 'fish_migration',
      locationId: 'island_001',
      spawnedAt: 1_000,
      expiresAt: 181_000,
      status: 'pending',
      choiceId: null,
      outcome: null,
      followUpEventId: null,
      followUpAt: null,
    }
    const state = { ...initialGameState, randomWorldEvents: [pending] }
    const result = resolveRandomWorldEvent(state, pending.id, 'catch_some', 10_000)

    expect(result.ok).toBe(true)
    expect(result.state?.survival).toMatchObject({
      health: initialGameState.survival.health - 10,
      thirst: initialGameState.survival.thirst - 12,
    })
    expect(result.message).toContain('Sức khỏe -10')
    expect(result.message).toContain('Khát -12')
    expect(state.survival.health).toBe(initialGameState.survival.health)
  })

  it('leaves the save unchanged when the player cannot pay an event cost', () => {
    const pending: RandomWorldEventRecord = {
      id: 'rescue-2',
      eventId: 'injured_sailor',
      locationId: 'island_001',
      spawnedAt: 1_000,
      expiresAt: 181_000,
      status: 'pending',
      choiceId: null,
      outcome: null,
      followUpEventId: null,
      followUpAt: null,
    }
    const state = {
      ...initialGameState,
      inventory: { ...initialGameState.inventory, slots: [] },
      randomWorldEvents: [pending],
    }
    const result = resolveRandomWorldEvent(state, pending.id, 'rescue', 10_000)

    expect(result).toMatchObject({ ok: false, message: 'Không đủ vật phẩm trong hành trang.' })
    expect(state.randomWorldEvents[0].status).toBe('pending')
    expect(state.character.coins).toBe(initialGameState.character.coins)
  })

  it('supports discovery choices and rejects a repeated or stale choice', () => {
    const pending: RandomWorldEventRecord = {
      id: 'mystery-1',
      eventId: 'hidden_cove',
      locationId: 'island_001',
      spawnedAt: 1_000,
      expiresAt: 181_000,
      status: 'pending',
      choiceId: null,
      outcome: null,
      followUpEventId: null,
      followUpAt: null,
    }
    const state = {
      ...initialGameState,
      character: { ...initialGameState.character, level: 2 },
      randomWorldEvents: [pending],
    }
    const result = resolveRandomWorldEvent(state, pending.id, 'chart', 10_000)

    expect(result.state?.discoveredIslandIds).toContain('island_002')
    expect(result.state?.inventory.slots).toContainEqual({ itemId: 'item_wood_plank', quantity: 2 })
    expect(resolveRandomWorldEvent(result.state!, pending.id, 'chart', 10_001).ok).toBe(false)
    expect(resolveRandomWorldEvent(state, pending.id, 'chart', pending.expiresAt).ok).toBe(false)
  })

  it('validates persisted random-event history while accepting older saves without it', () => {
    const record: RandomWorldEventRecord = {
      id: 'random-legacy-check',
      eventId: 'drifting_crate',
      locationId: 'island_001',
      spawnedAt: 1_000,
      expiresAt: 181_000,
      status: 'pending',
      choiceId: null,
      outcome: null,
      followUpEventId: null,
      followUpAt: null,
    }

    expect(isValidGameSnapshot(initialGameState)).toBe(true)
    expect(isValidGameSnapshot({
      ...initialGameState,
      randomWorldEvents: [record],
      nextRandomWorldEventAt: 200_000,
      character: { ...initialGameState.character, reputation: 75 },
    })).toBe(true)
    expect(isValidGameSnapshot({
      ...initialGameState,
      randomWorldEvents: [{ ...record, eventId: 'unknown-event' }],
    })).toBe(false)
    expect(isValidGameSnapshot({
      ...initialGameState,
      randomWorldEventScheduleVersion: 2,
      randomWorldEventSeed: 'account:test-account',
    })).toBe(true)
    expect(isValidGameSnapshot({
      ...initialGameState,
      randomWorldEventSeed: 'x'.repeat(201),
    })).toBe(false)
  })
})
