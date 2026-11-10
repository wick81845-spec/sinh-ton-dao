import { removeItems } from '../../inventory/services/inventoryService'
import type { GameSnapshot, PlayerShip, ShipConstructionJob } from '../../../shared/types/game'
import { getShipDefinition, shipDefinitions } from '../data/shipDefinitions'
import { technologyDefinitions } from '../../progression/data/progressionDefinitions'
import { getIslandDefinition } from '../../world/data/worldDefinitions'

export type ShipActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

export interface ShipCompletionResult {
  state: GameSnapshot
  completedShipId: string | null
}

function hasCost(state: GameSnapshot, definitionId: string): boolean {
  const definition = getShipDefinition(definitionId)
  return Boolean(definition?.constructionCost.every((cost) => state.inventory.slots
    .filter((slot) => slot.itemId === cost.itemId)
    .reduce((total, slot) => total + slot.quantity, 0) >= cost.quantity))
}

export function getShipConstructionAvailability(state: GameSnapshot, definitionId: string): string | null {
  const definition = getShipDefinition(definitionId)
  if (!definition) return 'Loại thuyền không tồn tại.'
  if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi đóng thuyền.'
  if (state.activeCombat) return 'Hãy kết thúc trận chiến trước khi đóng thuyền.'
  const requiredTechnologyId = definition.technologyId ?? 'tech_seafaring'
  if (!(state.character.researchedTechnologyIds ?? []).includes(requiredTechnologyId)) {
    const technologyName = technologyDefinitions.find((entry) => entry.id === requiredTechnologyId)?.name
    return `Cần nghiên cứu ${technologyName ?? 'công nghệ hàng hải'} trước khi đóng thuyền.`
  }
  if (definition.requiredLevel && state.character.level < definition.requiredLevel) {
    return `Cần đạt cấp ${definition.requiredLevel} để đóng ${definition.name}.`
  }
  if (definition.requiredDiscoveryId && !state.discoveredIslandIds.includes(definition.requiredDiscoveryId)) {
    const islandName = getIslandDefinition(definition.requiredDiscoveryId)?.name ?? definition.requiredDiscoveryId
    return `Cần khám phá ${islandName} trước khi đóng thuyền.`
  }
  if (state.shipConstruction) return 'Đang có tiến độ đóng hoặc nâng cấp thuyền.'
  if (state.character.currentLocationId !== state.character.homeIslandId) return 'Bạn phải ở đảo nhà để đóng thuyền.'
  if (state.activeExploration || state.activeGathering) return 'Hãy chờ hoạt động hiện tại hoàn tất trước.'
  if (state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
    return 'Thuyền đang đi trên hành trình.'
  }
  if (definition.upgradeFromDefinitionId) {
    const ship = state.ships.find((entry) => entry.definitionId === definition.upgradeFromDefinitionId)
    if (!ship) return `Cần có ${getShipDefinition(definition.upgradeFromDefinitionId)?.name ?? 'thuyền tương ứng'} để nâng cấp.`
    if (ship.status !== 'docked' || ship.currentLocationId !== state.character.homeIslandId) {
      return 'Thuyền cần cập bến tại đảo nhà trước khi nâng cấp.'
    }
  } else if (state.ships.length > 0) {
    return 'Bạn đã có thuyền; hãy chọn một phương án nâng cấp.'
  }
  if (!hasCost(state, definitionId)) return 'Không đủ nguyên liệu để đóng thuyền.'
  return null
}

export function startShipConstruction(state: GameSnapshot, definitionId: string, now: number): ShipActionResult {
  const issue = getShipConstructionAvailability(state, definitionId)
  if (issue) return { ok: false, message: issue }
  const definition = getShipDefinition(definitionId)
  if (!definition) return { ok: false, message: 'Loại thuyền không tồn tại.' }

  let inventory = state.inventory
  for (const cost of definition.constructionCost) {
    const result = removeItems(inventory, cost.itemId, cost.quantity)
    if (!result.ok) return { ok: false, message: 'Không thể tiêu hao nguyên liệu đóng thuyền.' }
    inventory = result.container
  }

  const shipToUpgrade = definition.upgradeFromDefinitionId
    ? state.ships.find((ship) => ship.definitionId === definition.upgradeFromDefinitionId)
    : undefined
  const shipConstruction: ShipConstructionJob = {
    id: `${definition.id}-${now}`,
    definitionId,
    ...(shipToUpgrade ? { upgradeShipId: shipToUpgrade.id } : {}),
    locationId: state.character.homeIslandId,
    startedAt: now,
    completesAt: now + definition.constructionDurationSeconds * 1000,
  }
  return {
    ok: true,
    state: { ...state, inventory, shipConstruction },
    message: `Đã bắt đầu đóng ${definition.name}.`,
  }
}

export function completeShipConstruction(state: GameSnapshot, now: number): ShipCompletionResult {
  const job = state.shipConstruction
  if (!job || now < job.completesAt) return { state, completedShipId: null }

  const definition = getShipDefinition(job.definitionId)
  if (!definition) {
    return { state: { ...state, shipConstruction: null }, completedShipId: null }
  }

  const existingShip = job.upgradeShipId
    ? state.ships.find((entry) => entry.id === job.upgradeShipId)
    : undefined
  const previousDefinition = existingShip ? getShipDefinition(existingShip.definitionId) : undefined
  const ship: PlayerShip = {
    id: job.upgradeShipId ?? `player-${definition.id}-${job.startedAt}`,
    definitionId: definition.id,
    currentLocationId: job.locationId,
    health: existingShip && previousDefinition
      ? Math.round(existingShip.health / previousDefinition.maxHealth * definition.maxHealth)
      : definition.maxHealth,
    status: 'docked',
  }
  const ships = job.upgradeShipId
    ? state.ships.map((entry) => entry.id === job.upgradeShipId ? ship : entry)
    : [...state.ships, ship]
  return {
    state: { ...state, ships, shipConstruction: null },
    completedShipId: ship.id,
  }
}

export { shipDefinitions }
