import { addItems } from '../../inventory/services/inventoryService'
import { explorationTasks, type ExplorationTaskDefinition } from '../data/explorationConfig'
import type { ActiveExploration, GameSnapshot } from '../../../shared/types/game'
import { worldEventDefinitions, getIslandDefinition } from '../../world/data/worldDefinitions'
import { awardExperience } from '../../progression/services/progressionService'
import { speciesDefinitionsById } from '../../ecology/data/ecologyDefinitions'

export type ExplorationActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

export type ExplorationCompletionResult =
  | { status: 'pending'; state: GameSnapshot }
  | { status: 'completed'; state: GameSnapshot; taskId: string; eventId: string | null; message: string }
  | { status: 'failed'; state: GameSnapshot; message: string }

function getTask(taskId: string): ExplorationTaskDefinition | undefined {
  return explorationTasks.find((task) => task.id === taskId)
}

function getTaskIssue(state: GameSnapshot, task: ExplorationTaskDefinition): string | null {
  if (state.activeExploration) return 'Đang có một hoạt động thám hiểm khác.'
  if (state.activeGathering) return 'Hãy chờ hoạt động thu thập hoàn tất trước.'
  if (state.shipConstruction) return 'Hãy chờ đóng thuyền hoàn tất trước.'
  if (state.craftingQueue.length > 0) return 'Hãy chờ hàng đợi chế tạo hoàn tất trước.'
  if (state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
    return 'Không thể thám hiểm khi thuyền đang di chuyển.'
  }
  if (state.character.currentLocationId !== task.locationId) return 'Bạn không ở đúng địa điểm để thực hiện nhiệm vụ này.'
  if (state.explorationLog.some((entry) => entry.taskId === task.id)) return 'Nhiệm vụ này đã hoàn thành.'
  if (state.survival.stamina < task.staminaCost) return 'Không đủ thể lực để thám hiểm.'

  let inventory = state.inventory
  for (const reward of task.rewards) {
    const result = addItems(inventory, reward.itemId, reward.quantity)
    if (!result.ok) return 'Túi đồ không đủ chỗ cho phần thưởng.'
    inventory = result.container
  }
  return null
}

export function getExplorationAvailability(state: GameSnapshot, taskId: string): string | null {
  const task = getTask(taskId)
  if (!task) return 'Nhiệm vụ thám hiểm không tồn tại.'
  if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi thám hiểm.'
  if (state.activeCombat) return 'Hãy kết thúc trận chiến trước khi thám hiểm.'
  return getTaskIssue(state, task)
}

export function startExploration(state: GameSnapshot, taskId: string, now: number): ExplorationActionResult {
  const task = getTask(taskId)
  if (!task) return { ok: false, message: 'Nhiệm vụ thám hiểm không tồn tại.' }
  const issue = getExplorationAvailability(state, taskId)
  if (issue) return { ok: false, message: issue }

  const activeExploration: ActiveExploration = {
    taskId,
    locationId: task.locationId,
    startedAt: now,
    completesAt: now + task.durationSeconds * 1000,
  }
  return {
    ok: true,
    state: { ...state, activeExploration },
    message: `Bắt đầu thám hiểm: ${task.name}.`,
  }
}

export function completeExploration(state: GameSnapshot, now: number): ExplorationCompletionResult {
  const active = state.activeExploration
  if (!active || now < active.completesAt) return { status: 'pending', state }

  const task = getTask(active.taskId)
  if (!task || active.locationId !== task.locationId || state.character.currentLocationId !== task.locationId) {
    return {
      status: 'failed',
      state: { ...state, activeExploration: null },
      message: 'Hoạt động thám hiểm không còn hợp lệ tại địa điểm hiện tại.',
    }
  }

  let inventory = state.inventory
  for (const reward of task.rewards) {
    const result = addItems(inventory, reward.itemId, reward.quantity)
    if (!result.ok) {
      return {
        status: 'failed',
        state: { ...state, activeExploration: null },
        message: 'Không thể nhận phần thưởng thám hiểm vì túi đồ đã đầy.',
      }
    }
    inventory = result.container
  }

  const discoveredIslandIds = [...new Set([...state.discoveredIslandIds, ...task.discoveredIslandIds])]
  const event = task.worldEventId
    ? worldEventDefinitions.find((entry) => entry.id === task.worldEventId)
    : undefined
  const explorationLog = {
    id: `${task.id}-${now}`,
    taskId: task.id,
    locationId: task.locationId,
    completedAt: now,
    rewards: task.rewards.map((reward) => ({ ...reward })),
    discoveredIslandIds: [...task.discoveredIslandIds],
    worldEventId: event?.id ?? null,
    ...(task.observedSpeciesId ? { observedSpeciesId: task.observedSpeciesId } : {}),
  }
  const worldEventLog = event
    ? [...state.worldEventLog, {
      id: `${event.id}-${now}`,
      eventId: event.id,
      locationId: task.locationId,
      occurredAt: now,
    }]
    : state.worldEventLog

  const newlyDiscovered = task.discoveredIslandIds
    .map(getIslandDefinition)
    .filter((island) => island !== undefined)
    .map((island) => island.name)
  const observedSpecies = task.observedSpeciesId
    ? speciesDefinitionsById[task.observedSpeciesId]
    : undefined
  const message = observedSpecies
    ? `Đã ghi nhận ${observedSpecies.name} bằng dấu vết và âm thanh.`
    : event
    ? `Thám hiểm hoàn tất: ${event.title}.`
    : newlyDiscovered.length > 0
      ? `Đã phát hiện ${newlyDiscovered.join(', ')}.`
      : `Thám hiểm hoàn tất: ${task.name}.`

  return {
    status: 'completed',
    state: {
      ...state,
      character: awardExperience(state.character, 'exploration', 12),
      inventory,
      survival: { ...state.survival, stamina: Math.max(0, state.survival.stamina - task.staminaCost) },
      discoveredIslandIds,
      activeExploration: null,
      explorationLog: [...state.explorationLog, explorationLog].slice(-100),
      worldEventLog: worldEventLog.slice(-100),
    },
    taskId: task.id,
    eventId: event?.id ?? null,
    message,
  }
}

export { explorationTasks }
