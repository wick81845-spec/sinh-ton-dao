import { islandDefinitions, getIslandDefinition } from '../../world/data/worldDefinitions'
import type { GameSnapshot, Voyage } from '../../../shared/types/game'
import { getCurrentWeather } from '../../world/services/weatherService'
import { getShipDefinition } from '../../ship/data/shipDefinitions'

export type VoyageActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

export interface VoyageUpdateResult {
  state: GameSnapshot
  changed: boolean
  arrivedVoyageId: string | null
  destinationName: string | null
}

function getVoyageIssue(state: GameSnapshot, destinationId: string): string | null {
  const destination = getIslandDefinition(destinationId)
  if (!destination) return 'Không tìm thấy điểm đến.'
  if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi đi biển.'
  if (state.activeCombat) return 'Hãy kết thúc trận chiến trước khi đi biển.'
  if (getCurrentWeather(state)?.severity === 'dangerous') {
    return `Đi biển đang quá nguy hiểm: ${getCurrentWeather(state)?.name ?? 'thời tiết nguy hiểm'}. Hãy chờ thời tiết đổi.`
  }
  if (!state.discoveredIslandIds.includes(destination.id)) return 'Bạn chưa phát hiện hòn đảo này.'
  if (destination.id === state.character.currentLocationId) return 'Bạn đang ở hòn đảo này.'
  if (state.ships.length === 0) return 'Cần đóng thuyền trước khi khởi hành.'
  if (state.activeGathering || state.activeExploration) return 'Hãy chờ hoạt động hiện tại hoàn tất trước.'
  if (state.craftingQueue.length > 0) return 'Hãy chờ hàng đợi chế tạo hoàn tất trước khi khởi hành.'
  if (state.shipConstruction) return 'Hãy chờ đóng thuyền hoàn tất trước.'
  if (state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
    return 'Đang có một chuyến đi khác.'
  }

  const ship = state.ships.find((entry) => entry.status === 'docked')
  if (!ship) return 'Không có thuyền sẵn sàng khởi hành.'
  if (ship.currentLocationId !== state.character.currentLocationId) return 'Thuyền không ở cùng địa điểm với bạn.'
  return null
}

export function getVoyageAvailability(state: GameSnapshot, destinationId: string): string | null {
  return getVoyageIssue(state, destinationId)
}

export function startVoyage(state: GameSnapshot, destinationId: string, now: number): VoyageActionResult {
  const issue = getVoyageIssue(state, destinationId)
  if (issue) return { ok: false, message: issue }

  const destination = getIslandDefinition(destinationId)
  const ship = state.ships.find((entry) => entry.status === 'docked')
  if (!destination || !ship) return { ok: false, message: 'Không thể chuẩn bị chuyến đi.' }

  const voyage: Voyage = {
    id: `voyage-${now}-${state.voyages.length + 1}`,
    shipId: ship.id,
    originId: state.character.currentLocationId,
    destinationId,
    status: 'departed',
    startedAt: now,
    completesAt: now + destination.travelDurationSeconds
      * (getShipDefinition(ship.definitionId)?.travelTimeMultiplier ?? 1)
      * (getCurrentWeather(state)?.severity === 'adverse' ? 1.5 : 1)
      * 1000,
    arrivedAt: null,
  }
  return {
    ok: true,
    state: {
      ...state,
      ships: state.ships.map((entry) => entry.id === ship.id ? { ...entry, status: 'traveling' } : entry),
      voyages: [...state.voyages, voyage].slice(-100),
    },
    message: `Đã khởi hành đến ${destination.name}.`,
  }
}

export function advanceVoyages(state: GameSnapshot, now: number): VoyageUpdateResult {
  const activeVoyage = state.voyages.find((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')
  if (!activeVoyage) return { state, changed: false, arrivedVoyageId: null, destinationName: null }

  if (now < activeVoyage.completesAt) {
    if (activeVoyage.status === 'traveling') return { state, changed: false, arrivedVoyageId: null, destinationName: null }
    return {
      state: {
        ...state,
        voyages: state.voyages.map((voyage) => voyage.id === activeVoyage.id
          ? { ...voyage, status: 'traveling' }
          : voyage),
    },
    changed: true,
    arrivedVoyageId: null,
    destinationName: null,
  }
  }

  const destination = getIslandDefinition(activeVoyage.destinationId)
  if (!destination) {
    return {
      state: {
        ...state,
        ships: state.ships.map((ship) => ship.id === activeVoyage.shipId
          ? { ...ship, status: 'damaged' }
          : ship),
        voyages: state.voyages.map((voyage) => voyage.id === activeVoyage.id
          ? { ...voyage, status: 'interrupted' }
          : voyage),
      },
      changed: true,
      arrivedVoyageId: null,
      destinationName: null,
    }
  }

  return {
    state: {
      ...state,
      character: { ...state.character, currentLocationId: destination.id },
      ships: state.ships.map((ship) => ship.id === activeVoyage.shipId
        ? { ...ship, currentLocationId: destination.id, status: 'docked' }
        : ship),
      voyages: state.voyages.map((voyage) => voyage.id === activeVoyage.id
        ? { ...voyage, status: 'arrived', arrivedAt: now }
        : voyage),
    },
    changed: true,
    arrivedVoyageId: activeVoyage.id,
    destinationName: destination.name,
  }
}

export function getDiscoveredDestinations(state: GameSnapshot) {
  return state.discoveredIslandIds
    .map((islandId) => islandDefinitions.find((island) => island.id === islandId))
    .filter((island) => island !== undefined)
}
