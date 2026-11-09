import { randomWorldEventDefinitions, type RandomWorldEventChoice } from '../data/randomWorldEventDefinitions'
import { islandDefinitions } from '../data/worldDefinitions'
import { addItems, removeItems } from '../../inventory/services/inventoryService'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import type { GameSnapshot, RandomWorldEventRecord } from '../../../shared/types/game'

export const RANDOM_WORLD_EVENT_INTERVAL_MS = 30 * 60 * 1000
const EVENT_DURATION_MS = 180_000

export interface RandomWorldEventAdvance {
  state: GameSnapshot
  changed: boolean
  spawned?: RandomWorldEventRecord
}

export interface RandomWorldEventActionResult {
  ok: boolean
  state?: GameSnapshot
  message: string
}

function hashNumber(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function choiceForEvent(eventId: string, choiceId: string): RandomWorldEventChoice | undefined {
  return randomWorldEventDefinitions.find((event) => event.id === eventId)
    ?.choices.find((choice) => choice.id === choiceId)
}

function getEligibleEvents(state: GameSnapshot) {
  const island = islandDefinitions.find((entry) => entry.id === state.character.currentLocationId)
  const weatherId = state.weather?.locationId === state.character.currentLocationId
    ? state.weather.weatherId
    : undefined
  const recentEventIds = new Set((state.randomWorldEvents ?? [])
    .slice(-3)
    .map((record) => record.eventId))
  return randomWorldEventDefinitions.filter((event) => {
    if (event.weight <= 0) return false
    if (event.minimumLevel && state.character.level < event.minimumLevel) return false
    if (event.requiresShip && state.ships.length === 0) return false
    if (event.requiredWeatherIds && (!weatherId || !event.requiredWeatherIds.includes(weatherId))) return false
    if (recentEventIds.has(event.id)) return false
    if (!island) return false
    if (event.allowedBiomeIds && !event.allowedBiomeIds.includes(island.biomeId)) return false
    if (event.allowedRegionIds && !event.allowedRegionIds.includes(island.regionId)) return false
    return true
  })
}

function pickEvent(state: GameSnapshot, now: number) {
  const records = state.randomWorldEvents ?? []
  const dueFollowUp = records.find((record) => record.followUpEventId
    && record.followUpAt !== null
    && record.followUpAt <= now
    && !records.some((candidate) => candidate.eventId === record.followUpEventId))
  if (dueFollowUp?.followUpEventId) {
    return randomWorldEventDefinitions.find((event) => event.id === dueFollowUp.followUpEventId)
  }

  const eligible = getEligibleEvents(state)
  if (eligible.length === 0) return undefined
  const totalWeight = eligible.reduce((total, event) => total + event.weight, 0)
  const slot = Math.floor(now / RANDOM_WORLD_EVENT_INTERVAL_MS)
  const seed = state.randomWorldEventSeed ?? state.character.id
  let ticket = (hashNumber(`${seed}:${state.character.currentLocationId}:${slot}`) / 0x1_0000_0000) * totalWeight
  for (const event of eligible) {
    ticket -= event.weight
    if (ticket < 0) return event
  }
  return eligible.at(-1)
}

export function advanceRandomWorldEvents(state: GameSnapshot, now: number): RandomWorldEventAdvance {
  const records = state.randomWorldEvents ?? []
  const expiredRecords = records.map((record) => (
    record.status === 'pending' && now >= record.expiresAt
      ? { ...record, status: 'expired' as const }
      : record
  ))
  const expired = expiredRecords.some((record, index) => record !== records[index])
  if (state.character.status !== 'alive' || expiredRecords.some((record) => record.status === 'pending')) {
    return {
      state: expired ? { ...state, randomWorldEvents: expiredRecords } : state,
      changed: expired,
    }
  }

  const nextAt = state.nextRandomWorldEventAt
  if (nextAt === undefined) {
    return {
      state: {
        ...state,
        randomWorldEvents: expiredRecords,
        nextRandomWorldEventAt: now + RANDOM_WORLD_EVENT_INTERVAL_MS,
        randomWorldEventScheduleVersion: 2,
      },
      changed: true,
    }
  }
  if (now < nextAt) {
    return expired ? { state: { ...state, randomWorldEvents: expiredRecords }, changed: true } : { state, changed: false }
  }

  const event = pickEvent({ ...state, randomWorldEvents: expiredRecords }, now)
  if (!event) {
    return {
      state: {
        ...state,
        randomWorldEvents: expiredRecords,
        nextRandomWorldEventAt: now + RANDOM_WORLD_EVENT_INTERVAL_MS,
        randomWorldEventScheduleVersion: 2,
      },
      changed: true,
    }
  }

  const spawned: RandomWorldEventRecord = {
    id: `random-event-${hashNumber(`${event.id}:${now}:${state.randomWorldEventSeed ?? state.character.id}`).toString(36)}`,
    eventId: event.id,
    locationId: state.character.currentLocationId,
    spawnedAt: now,
    expiresAt: now + EVENT_DURATION_MS,
    status: 'pending',
    choiceId: null,
    outcome: null,
    followUpEventId: null,
    followUpAt: null,
  }
  return {
    state: {
      ...state,
      randomWorldEvents: [...expiredRecords, spawned].slice(-50),
      nextRandomWorldEventAt: now + RANDOM_WORLD_EVENT_INTERVAL_MS,
      randomWorldEventScheduleVersion: 2,
    },
    changed: true,
    spawned,
  }
}

export function getRandomEventChoiceIssue(
  state: GameSnapshot,
  eventId: string,
  choice: RandomWorldEventChoice,
): string | undefined {
  if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi tham gia sự kiện.'
  if (choice.coinCost && (state.character.coins ?? 0) < choice.coinCost) return 'Không đủ xu.'
  for (const cost of choice.costs ?? []) {
    const available = state.inventory.slots
      .filter((slot) => slot.itemId === cost.itemId)
      .reduce((total, slot) => total + slot.quantity, 0)
    if (available < cost.quantity) return 'Không đủ vật phẩm trong hành trang.'
  }
  let resultingInventory = state.inventory
  for (const cost of choice.costs ?? []) {
    const result = removeItems(resultingInventory, cost.itemId, cost.quantity)
    if (!result.ok) return result.message
    resultingInventory = result.container
  }
  for (const reward of choice.rewards ?? []) {
    const result = addItems(resultingInventory, reward.itemId, reward.quantity)
    if (!result.ok) return 'Hành trang không đủ chỗ cho kết quả sự kiện.'
    resultingInventory = result.container
  }
  if (choice.discoverIslandId && !islandDefinitions.some((island) => island.id === choice.discoverIslandId)) {
    return `Sự kiện ${eventId} yêu cầu một địa điểm không hợp lệ.`
  }
  return undefined
}

export function resolveRandomWorldEvent(
  state: GameSnapshot,
  recordId: string,
  choiceId: string,
  now: number,
): RandomWorldEventActionResult {
  const records = state.randomWorldEvents ?? []
  const record = records.find((entry) => entry.id === recordId)
  if (!record || record.status !== 'pending') return { ok: false, message: 'Sự kiện này không còn khả dụng.' }
  if (now >= record.expiresAt) return { ok: false, message: 'Sự kiện đã kết thúc.' }
  if (record.locationId !== state.character.currentLocationId) return { ok: false, message: 'Bạn đã rời khỏi khu vực sự kiện.' }
  if (state.activeCombat) return { ok: false, message: 'Không thể xử lý sự kiện trong lúc chiến đấu.' }

  const choice = choiceForEvent(record.eventId, choiceId)
  if (!choice) return { ok: false, message: 'Lựa chọn sự kiện không hợp lệ.' }
  const issue = getRandomEventChoiceIssue(state, record.eventId, choice)
  if (issue) return { ok: false, message: issue }

  let inventory = state.inventory
  for (const cost of choice.costs ?? []) {
    const result = removeItems(inventory, cost.itemId, cost.quantity)
    if (!result.ok) return { ok: false, message: result.message }
    inventory = result.container
  }
  for (const reward of choice.rewards ?? []) {
    const result = addItems(inventory, reward.itemId, reward.quantity)
    if (!result.ok) return { ok: false, message: `Không đủ chỗ trong hành trang để nhận thưởng: ${result.message}` }
    inventory = result.container
  }

  const followUpEventId = choice.followUpEventId ?? null
  const outcomeDetails = [
    ...(choice.costs ?? []).map((cost) => `Đã dùng ${itemDefinitions[cost.itemId].name} × ${cost.quantity}`),
    ...(choice.rewards ?? []).map((reward) => `Nhận ${itemDefinitions[reward.itemId].name} × ${reward.quantity}`),
    ...(choice.coinCost ? [`Đã dùng ${choice.coinCost} xu`] : []),
    ...(choice.coinReward ? [`Nhận ${choice.coinReward} xu`] : []),
    ...(choice.reputationDelta ? [`Danh tiếng ${choice.reputationDelta > 0 ? '+' : ''}${choice.reputationDelta}`] : []),
    ...(choice.staminaDelta ? [`Thể lực ${choice.staminaDelta > 0 ? '+' : ''}${choice.staminaDelta}`] : []),
    ...(choice.healthDelta ? [`Sức khỏe ${choice.healthDelta > 0 ? '+' : ''}${choice.healthDelta}`] : []),
    ...(choice.hungerDelta ? [`Đói ${choice.hungerDelta > 0 ? '+' : ''}${choice.hungerDelta}`] : []),
    ...(choice.thirstDelta ? [`Khát ${choice.thirstDelta > 0 ? '+' : ''}${choice.thirstDelta}`] : []),
    ...(choice.discoverIslandId && !state.discoveredIslandIds.includes(choice.discoverIslandId)
      ? [`Đã ghi nhận địa điểm mới: ${islandDefinitions.find((island) => island.id === choice.discoverIslandId)?.name ?? choice.discoverIslandId}`]
      : []),
  ]
  const outcome = outcomeDetails.length > 0
    ? `${choice.resultText} ${outcomeDetails.join(' · ')}.`
    : choice.resultText
  const updatedRecords = records.map((entry) => entry.id === recordId
    ? {
      ...entry,
      status: 'resolved' as const,
      choiceId,
      outcome,
      followUpEventId,
      followUpAt: followUpEventId ? now + RANDOM_WORLD_EVENT_INTERVAL_MS : null,
    }
    : entry)
  const discoveredIslandIds = choice.discoverIslandId
    && !state.discoveredIslandIds.includes(choice.discoverIslandId)
    ? [...state.discoveredIslandIds, choice.discoverIslandId]
    : state.discoveredIslandIds
  const stamina = Math.max(0, Math.min(100, state.survival.stamina + (choice.staminaDelta ?? 0)))
  const health = Math.max(0, Math.min(100, state.survival.health + (choice.healthDelta ?? 0)))
  const hunger = Math.max(0, Math.min(100, state.survival.hunger + (choice.hungerDelta ?? 0)))
  const thirst = Math.max(0, Math.min(100, state.survival.thirst + (choice.thirstDelta ?? 0)))
  const reputation = Math.max(0, Math.min(100, (state.character.reputation ?? 50) + (choice.reputationDelta ?? 0)))
  const coins = Math.max(0, (state.character.coins ?? 0) - (choice.coinCost ?? 0) + (choice.coinReward ?? 0))
  return {
    ok: true,
    state: {
      ...state,
      inventory,
      discoveredIslandIds,
      character: { ...state.character, coins, reputation, ...(health === 0 ? { status: 'dead' as const } : {}) },
      survival: {
        ...state.survival,
        stamina,
        health,
        hunger,
        thirst,
        conditions: [
          ...(hunger <= 25 ? [hunger === 0 ? 'starving' : 'hungry'] : []),
          ...(thirst <= 25 ? [thirst === 0 ? 'dehydrated' : 'thirsty'] : []),
        ],
      },
      isResting: false,
      randomWorldEvents: updatedRecords.slice(-50),
      nextRandomWorldEventAt: now + RANDOM_WORLD_EVENT_INTERVAL_MS,
      randomWorldEventScheduleVersion: 2,
    },
    message: outcome,
  }
}
