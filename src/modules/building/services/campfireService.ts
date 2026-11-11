import { removeItems } from '../../inventory/services/inventoryService'
import type { CampfireFuelState, GameSnapshot, ItemId } from '../../../shared/types/game'

export const campfireFuelOptions: readonly { itemId: ItemId; durationMs: number }[] = [
  { itemId: 'item_branch', durationMs: 5 * 60 * 1000 },
  { itemId: 'item_wood', durationMs: 15 * 60 * 1000 },
  { itemId: 'item_charcoal', durationMs: 30 * 60 * 1000 },
]

export type CampfireActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

export interface CampfireAdvanceResult {
  state: GameSnapshot
  changed: boolean
  extinguishedBuildingIds: string[]
}

function getCampfireBuilding(state: GameSnapshot, buildingId: string) {
  return state.buildings.find((building) => (
    building.id === buildingId
    && building.definitionId === 'building_campfire'
    && building.status === 'completed'
    && building.islandId === state.character.currentLocationId
  ))
}

export function getCampfireRemainingMs(state: GameSnapshot, buildingId: string, now: number): number {
  const fuel = state.campfireFuel?.[buildingId]
  if (!fuel) return 0
  return Math.max(0, fuel.remainingMs - Math.max(0, now - fuel.lastUpdatedAt))
}

export function isCampfireLitAt(state: GameSnapshot, buildingId: string, now: number): boolean {
  return Boolean(getCampfireBuilding(state, buildingId)) && getCampfireRemainingMs(state, buildingId, now) > 0
}

export function setCampfireWarming(
  state: GameSnapshot,
  buildingId: string,
  now: number,
  isWarming: boolean,
): CampfireActionResult {
  if (!isWarming) {
    return {
      ok: true,
      state: { ...state, isWarmingAtCampfire: false },
      message: 'Bạn đã dừng sưởi ấm bên lửa trại.',
    }
  }
  if (state.character.status !== 'alive') {
    return { ok: false, message: 'Bạn cần hồi sinh trước khi sưởi ấm.' }
  }
  if (!isCampfireLitAt(state, buildingId, now)) {
    return { ok: false, message: 'Cần có lửa trại đang cháy để sưởi ấm.' }
  }
  if ((state.survival.bodyTemperature ?? 37) >= 37) {
    return { ok: false, message: 'Thân nhiệt đã đạt mức an toàn, bạn chưa cần sưởi thêm.' }
  }
  return {
    ok: true,
    state: { ...state, isWarmingAtCampfire: true },
    message: 'Bạn bắt đầu sưởi ấm bên lửa trại. Thân nhiệt sẽ tăng dần đến 37°C.',
  }
}

export function fuelCampfire(
  state: GameSnapshot,
  buildingId: string,
  fuelItemId: ItemId,
  now: number,
): CampfireActionResult {
  if (state.character.status !== 'alive') return { ok: false, message: 'Bạn cần hồi sinh trước khi nhóm thêm lửa.' }
  if (state.activeCombat) return { ok: false, message: 'Không thể thêm nhiên liệu trong khi chiến đấu.' }
  if (!getCampfireBuilding(state, buildingId)) {
    return { ok: false, message: 'Không tìm thấy lửa trại đã hoàn thành tại đảo này.' }
  }
  const option = campfireFuelOptions.find((entry) => entry.itemId === fuelItemId)
  if (!option) return { ok: false, message: 'Vật phẩm này không thể dùng làm nhiên liệu.' }
  const removed = removeItems(state.inventory, fuelItemId, 1)
  if (!removed.ok) return { ok: false, message: `Không có ${fuelItemId === 'item_branch' ? 'cành cây' : fuelItemId === 'item_wood' ? 'gỗ trôi dạt' : 'than củi'} trong túi.` }

  const remainingMs = getCampfireRemainingMs(state, buildingId, now) + option.durationMs
  const campfireFuel: Record<string, CampfireFuelState> = {
    ...state.campfireFuel,
    [buildingId]: { remainingMs, lastUpdatedAt: now },
  }
  return {
    ok: true,
    state: { ...state, inventory: removed.container, campfireFuel },
    message: `Đã thêm nhiên liệu. Lửa trại cháy thêm ${Math.round(option.durationMs / 60_000)} phút.`,
  }
}

export function advanceCampfireFuel(state: GameSnapshot, now: number): CampfireAdvanceResult {
  const campfireIds = state.buildings
    .filter((building) => building.definitionId === 'building_campfire' && building.status === 'completed')
    .map((building) => building.id)
  const existingFuel = state.campfireFuel ?? {}
  let changed = false
  const extinguishedBuildingIds: string[] = []
  const campfireFuel: Record<string, CampfireFuelState> = {}

  for (const buildingId of campfireIds) {
    const fuel = existingFuel[buildingId]
    if (!fuel) continue
    const remainingMs = getCampfireRemainingMs(state, buildingId, now)
    if (remainingMs !== fuel.remainingMs || fuel.lastUpdatedAt !== now) changed = true
    campfireFuel[buildingId] = { remainingMs, lastUpdatedAt: now }
    if (fuel.remainingMs > 0 && remainingMs === 0) extinguishedBuildingIds.push(buildingId)
  }

  if (Object.keys(existingFuel).some((buildingId) => !campfireIds.includes(buildingId))) changed = true
  return {
    state: changed ? { ...state, campfireFuel } : state,
    changed,
    extinguishedBuildingIds,
  }
}
