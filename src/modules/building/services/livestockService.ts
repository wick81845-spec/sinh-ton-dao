import type { GameSnapshot, LivestockPen } from '../../../shared/types/game'
import { addItems, removeItems } from '../../inventory/services/inventoryService'

const eggProductionIntervalMs = 10 * 60 * 1000
const milkProductionIntervalMs = 15 * 60 * 1000
const maximumChickensPerCoop = 3
const maximumGoatsPerPen = 2
const maximumEggsPerCollection = 20
const maximumMilkPerCollection = 20

export type LivestockActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

function getCoop(state: GameSnapshot, buildingId: string) {
  return state.buildings.find((building) => (
    building.id === buildingId
    && building.definitionId === 'building_chicken_coop'
    && building.status === 'completed'
    && building.islandId === state.character.currentLocationId
  ))
}

function getGoatPen(state: GameSnapshot, buildingId: string) {
  return state.buildings.find((building) => (
    building.id === buildingId
    && building.definitionId === 'building_goat_pen'
    && building.status === 'completed'
    && building.islandId === state.character.currentLocationId
  ))
}

export function raiseChicken(state: GameSnapshot, buildingId: string, now: number): LivestockActionResult {
  if (state.character.status !== 'alive') return { ok: false, message: 'Bạn cần hồi sinh trước khi chăm sóc vật nuôi.' }
  if (state.activeCombat || state.activeGathering || state.activeExploration) {
    return { ok: false, message: 'Hãy kết thúc hoạt động hiện tại trước khi chăm sóc vật nuôi.' }
  }
  if (!getCoop(state, buildingId)) return { ok: false, message: 'Cần có chuồng gà hoàn thành tại đảo hiện tại.' }
  const pen = (state.livestockPens ?? []).find((entry) => entry.buildingId === buildingId)
  if ((pen?.chickenCount ?? 0) >= maximumChickensPerCoop) return { ok: false, message: 'Chuồng gà đã đủ sức chứa.' }
  const inventory = removeItems(state.inventory, 'item_chicken', 1)
  if (!inventory.ok) return { ok: false, message: 'Cần có gà con trong hành trang.' }
  const livestock: LivestockPen = {
    buildingId,
    chickenCount: (pen?.chickenCount ?? 0) + 1,
    nextEggAt: pen?.nextEggAt ?? now + eggProductionIntervalMs,
    ...(pen?.goatCount !== undefined ? { goatCount: pen.goatCount } : {}),
    ...(pen?.nextMilkAt !== undefined ? { nextMilkAt: pen.nextMilkAt } : {}),
  }
  return {
    ok: true,
    state: {
      ...state,
      inventory: inventory.container,
      livestockPens: [
        ...(state.livestockPens ?? []).filter((entry) => entry.buildingId !== buildingId),
        livestock,
      ],
    },
    message: `Đã nuôi gà trong chuồng (${livestock.chickenCount}/${maximumChickensPerCoop}).`,
  }
}

export function collectEggs(state: GameSnapshot, buildingId: string, now: number): LivestockActionResult {
  if (state.character.status !== 'alive') return { ok: false, message: 'Bạn cần hồi sinh trước khi thu hoạch.' }
  if (!getCoop(state, buildingId)) return { ok: false, message: 'Cần có chuồng gà hoàn thành tại đảo hiện tại.' }
  const pen = (state.livestockPens ?? []).find((entry) => entry.buildingId === buildingId)
  const chickenCount = pen?.chickenCount ?? 0
  const nextEggAt = pen?.nextEggAt
  if (!pen || !nextEggAt || chickenCount < 1 || now < nextEggAt) {
    return { ok: false, message: 'Gà chưa đẻ trứng; hãy chờ thêm.' }
  }
  const completedPeriods = Math.floor((now - nextEggAt) / eggProductionIntervalMs) + 1
  const quantity = Math.min(maximumEggsPerCollection, completedPeriods * chickenCount)
  const periodsCollected = Math.ceil(quantity / chickenCount)
  const inventory = addItems(state.inventory, 'item_egg', quantity, now)
  if (!inventory.ok) return { ok: false, message: 'Túi đồ không đủ chỗ để nhận trứng.' }
  const livestockPens = (state.livestockPens ?? []).map((entry) => entry.buildingId === buildingId
    ? { ...entry, nextEggAt: nextEggAt + periodsCollected * eggProductionIntervalMs }
    : entry)
  return {
    ok: true,
    state: { ...state, inventory: inventory.container, livestockPens },
    message: `Đã thu ${quantity} trứng gà.`,
  }
}

export function raiseGoat(state: GameSnapshot, buildingId: string, now: number): LivestockActionResult {
  if (state.character.status !== 'alive') return { ok: false, message: 'Bạn cần hồi sinh trước khi chăm sóc vật nuôi.' }
  if (state.activeCombat || state.activeGathering || state.activeExploration) {
    return { ok: false, message: 'Hãy kết thúc hoạt động hiện tại trước khi chăm sóc vật nuôi.' }
  }
  if (!getGoatPen(state, buildingId)) return { ok: false, message: 'Cần có chuồng dê hoàn thành tại đảo hiện tại.' }
  const pen = (state.livestockPens ?? []).find((entry) => entry.buildingId === buildingId)
  const goatCount = pen?.goatCount ?? 0
  if (goatCount >= maximumGoatsPerPen) return { ok: false, message: 'Chuồng dê đã đủ sức chứa.' }
  const inventory = removeItems(state.inventory, 'item_goat', 1)
  if (!inventory.ok) return { ok: false, message: 'Cần có dê con trong hành trang.' }
  const livestock: LivestockPen = {
    buildingId,
    ...(pen?.chickenCount !== undefined ? { chickenCount: pen.chickenCount } : {}),
    ...(pen?.nextEggAt !== undefined ? { nextEggAt: pen.nextEggAt } : {}),
    goatCount: goatCount + 1,
    nextMilkAt: pen?.nextMilkAt ?? now + milkProductionIntervalMs,
  }
  return {
    ok: true,
    state: {
      ...state,
      inventory: inventory.container,
      livestockPens: [
        ...(state.livestockPens ?? []).filter((entry) => entry.buildingId !== buildingId),
        livestock,
      ],
    },
    message: `Đã nuôi dê trong chuồng (${livestock.goatCount}/${maximumGoatsPerPen}).`,
  }
}

export function collectGoatMilk(state: GameSnapshot, buildingId: string, now: number): LivestockActionResult {
  if (state.character.status !== 'alive') return { ok: false, message: 'Bạn cần hồi sinh trước khi thu hoạch.' }
  if (!getGoatPen(state, buildingId)) return { ok: false, message: 'Cần có chuồng dê hoàn thành tại đảo hiện tại.' }
  const pen = (state.livestockPens ?? []).find((entry) => entry.buildingId === buildingId)
  const goatCount = pen?.goatCount ?? 0
  const nextMilkAt = pen?.nextMilkAt
  if (!pen || goatCount < 1 || !nextMilkAt || now < nextMilkAt) {
    return { ok: false, message: 'Dê chưa cho sữa; hãy chờ thêm.' }
  }
  const completedPeriods = Math.floor((now - nextMilkAt) / milkProductionIntervalMs) + 1
  const quantity = Math.min(maximumMilkPerCollection, completedPeriods * goatCount)
  const periodsCollected = Math.ceil(quantity / goatCount)
  const inventory = addItems(state.inventory, 'item_goat_milk', quantity, now)
  if (!inventory.ok) return { ok: false, message: 'Túi đồ không đủ chỗ để nhận sữa dê.' }
  const livestockPens = (state.livestockPens ?? []).map((entry) => entry.buildingId === buildingId
    ? { ...entry, nextMilkAt: nextMilkAt + periodsCollected * milkProductionIntervalMs }
    : entry)
  return {
    ok: true,
    state: { ...state, inventory: inventory.container, livestockPens },
    message: `Đã thu ${quantity} phần sữa dê.`,
  }
}
