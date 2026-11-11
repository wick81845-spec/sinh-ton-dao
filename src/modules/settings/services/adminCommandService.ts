import { respawnCharacter } from '../../combat/services/combatService'
import { addItems, removeItems } from '../../inventory/services/inventoryService'
import { getSurvivalConditions } from '../../survival/utils/survivalCalculator'
import { getIslandDefinition } from '../../world/data/worldDefinitions'
import { createWeatherState } from '../../world/services/weatherService'
import type { AdminSurvivalCommand } from '../../../shared/types/admin'
import type { GameSnapshot } from '../../../shared/types/game'

export type AdminCommandApplication =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; state: GameSnapshot; message: string }

export function applyAdminCommand(
  state: GameSnapshot,
  command: AdminSurvivalCommand,
  commandId: string,
  now = Date.now(),
): AdminCommandApplication {
  let nextState = state
  if ((command.revive || command.restoreAll) && state.character.status === 'dead') {
    const result = respawnCharacter(state)
    if (!result.ok) return { ok: false, state, message: result.message }
    nextState = result.state
  }

  for (const transfer of command.itemTransfers ?? []) {
    const currentContainer = nextState[transfer.container]
    const result = transfer.action === 'give'
      ? addItems(currentContainer, transfer.itemId, transfer.quantity, now)
      : removeItems(currentContainer, transfer.itemId, transfer.quantity)
    if (!result.ok) {
      return {
        ok: false,
        state,
        message: `Không thể ${transfer.action === 'give' ? 'trao' : 'thu hồi'} ${transfer.quantity} ${transfer.itemId}: ${result.message}`,
      }
    }
    nextState = { ...nextState, [transfer.container]: result.container }
  }

  const survival = {
    ...nextState.survival,
    ...(command.restoreAll ? {
      health: 100,
      hunger: 100,
      thirst: 100,
      stamina: 100,
      bodyTemperature: 37,
      wetness: 0,
    } : {}),
    ...(command.health !== undefined ? { health: command.health } : {}),
    ...(command.hunger !== undefined ? { hunger: command.hunger } : {}),
    ...(command.thirst !== undefined ? { thirst: command.thirst } : {}),
    ...(command.stamina !== undefined ? { stamina: command.stamina } : {}),
    ...(command.bodyTemperature !== undefined ? { bodyTemperature: command.bodyTemperature } : {}),
    ...(command.wetness !== undefined ? { wetness: command.wetness } : {}),
  }
  survival.conditions = getSurvivalConditions(survival)

  const destination = command.teleportToIslandId
    ? getIslandDefinition(command.teleportToIslandId)
    : undefined
  const appliedAdminCommandIds = [...(state.appliedAdminCommandIds ?? []), commandId].slice(-100)
  nextState = {
    ...nextState,
    survival,
    ailments: command.restoreAll ? [] : command.ailments ?? nextState.ailments ?? [],
    appliedAdminCommandIds,
    character: {
      ...nextState.character,
      ...(command.restoreAll
        ? { status: 'alive' as const }
        : command.health === undefined
          ? {}
          : { status: command.health === 0 ? 'dead' as const : 'alive' as const }),
      ...(destination ? { currentLocationId: destination.id } : {}),
    },
    ...(destination ? {
      discoveredIslandIds: nextState.discoveredIslandIds.includes(destination.id)
        ? nextState.discoveredIslandIds
        : [...nextState.discoveredIslandIds, destination.id],
      weather: createWeatherState(destination.id, now),
      isResting: false,
      isWarmingAtCampfire: false,
      activeGathering: null,
      activeExploration: null,
      activeCombat: null,
    } : {}),
  }

  const notices = [
    command.restoreAll ? 'Đã khôi phục toàn bộ trạng thái sinh tồn.' : null,
    command.revive ? 'Lệnh hồi sinh đã được xử lý.' : null,
    command.itemTransfers?.length ? 'Vật phẩm đã được cập nhật.' : null,
    destination ? `Đã chuyển bạn đến ${destination.name}.` : null,
    !command.restoreAll && !command.revive && !command.itemTransfers?.length && !destination
      ? 'Quản trị viên đã cập nhật trạng thái sinh tồn của bạn.'
      : null,
  ].filter((notice): notice is string => notice !== null)

  return { ok: true, state: nextState, message: notices.join(' ') }
}
