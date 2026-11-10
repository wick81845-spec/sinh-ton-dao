import type { GameSnapshot } from '../../../shared/types/game'
import { isSurvivorBusy } from '../../survival/utils/survivalCalculator'
import { createWeatherState } from './weatherService'
import { getIslandDefinition } from '../data/worldDefinitions'

export type AdminExplorationResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

export function visitIslandAsAdmin(
  state: GameSnapshot,
  islandId: string,
  isAdmin: boolean,
  now: number,
): AdminExplorationResult {
  if (!isAdmin) return { ok: false, message: 'Bạn không có quyền sử dụng chế độ quản trị.' }
  const island = getIslandDefinition(islandId)
  if (!island) return { ok: false, message: 'Không tìm thấy hòn đảo cần đến.' }
  if (state.character.status !== 'alive') {
    return { ok: false, message: 'Bạn cần hồi sinh trước khi di chuyển.' }
  }
  if (isSurvivorBusy(state)) {
    return { ok: false, message: 'Hãy hoàn thành hoạt động hiện tại trước khi di chuyển.' }
  }
  if (state.character.currentLocationId === islandId) {
    return { ok: true, state, message: `Bạn đang ở ${island.name}.` }
  }

  const discoveredIslandIds = state.discoveredIslandIds.includes(islandId)
    ? state.discoveredIslandIds
    : [...state.discoveredIslandIds, islandId]

  return {
    ok: true,
    state: {
      ...state,
      character: { ...state.character, currentLocationId: islandId },
      discoveredIslandIds,
      weather: createWeatherState(islandId, now),
      isResting: false,
    },
    message: `Đã mở khóa và di chuyển nhanh đến ${island.name}.`,
  }
}
