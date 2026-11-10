import type { ClothesDryingState, GameSnapshot } from '../../../shared/types/game'
import { getCampfireRemainingMs, isCampfireLitAt } from './campfireService'

export const clothesDryingDurationMs = 3 * 60 * 1000

export type ClothesDryingResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

export function getClothesDryingRemainingMs(state: GameSnapshot, now: number): number {
  const drying = state.clothesDrying
  if (!drying) return 0
  return Math.max(0, drying.completesAt - now)
}

export function startClothesDrying(
  state: GameSnapshot,
  buildingId: string,
  now: number,
): ClothesDryingResult {
  if (state.character.status !== 'alive') return { ok: false, message: 'Bạn cần hồi sinh trước khi phơi quần áo.' }
  if (state.activeCombat) return { ok: false, message: 'Không thể phơi quần áo khi đang chiến đấu.' }
  if (state.character.currentLocationId !== state.character.homeIslandId) {
    return { ok: false, message: 'Chỉ có thể phơi quần áo cạnh lửa trại tại đảo nhà.' }
  }
  if (state.survival.wetness === undefined || state.survival.wetness <= 0) {
    return { ok: false, message: 'Quần áo đã khô, chưa cần phơi.' }
  }
  if (state.clothesDrying && now < state.clothesDrying.completesAt) {
    return { ok: false, message: 'Quần áo đang được phơi rồi.' }
  }
  if (!isCampfireLitAt(state, buildingId, now)) {
    return { ok: false, message: 'Cần có lửa trại đang cháy để phơi quần áo.' }
  }
  if (getCampfireRemainingMs(state, buildingId, now) < clothesDryingDurationMs) {
    return { ok: false, message: 'Cần lửa trại cháy liên tục ít nhất 3 phút để phơi quần áo.' }
  }

  const clothesDrying: ClothesDryingState = {
    buildingId,
    startedAt: now,
    completesAt: now + clothesDryingDurationMs,
  }
  return {
    ok: true,
    state: { ...state, clothesDrying, isResting: false },
    message: 'Bắt đầu phơi quần áo cạnh lửa trại. Quần áo sẽ khô sau 3 phút.',
  }
}

export function advanceClothesDrying(
  state: GameSnapshot,
  now: number,
): { state: GameSnapshot; completed: boolean } {
  if (!state.clothesDrying || now < state.clothesDrying.completesAt) {
    return { state, completed: false }
  }

  return {
    state: {
      ...state,
      clothesDrying: null,
      survival: { ...state.survival, wetness: 0 },
    },
    completed: true,
  }
}
