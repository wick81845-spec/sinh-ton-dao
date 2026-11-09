import { addItems, removeItems } from '../../inventory/services/inventoryService'
import type { GameSnapshot, ItemId, SocialTradeOffer } from '../../../shared/types/game'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { getMockPlayer, mockPlayers } from '../data/playerDirectory'
import { islandDefinitions } from '../../world/data/worldDefinitions'

export type SocialActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

function isBusy(state: GameSnapshot): boolean {
  return Boolean(state.character.status !== 'alive'
    || state.activeGathering
    || state.activeExploration
    || state.activeCombat
    || state.craftingQueue.length > 0
    || state.shipConstruction
    || state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling'))
}

export function addFriend(state: GameSnapshot, playerId: string): SocialActionResult {
  const player = getMockPlayer(playerId)
  if (!player) return { ok: false, message: 'Không tìm thấy hồ sơ người chơi.' }
  if (state.friendIds.includes(player.id)) return { ok: false, message: `${player.name} đã ở trong danh sách bạn bè.` }
  return {
    ok: true,
    state: { ...state, friendIds: [...state.friendIds, player.id] },
    message: `Lời mời kết bạn mô phỏng với ${player.name} đã được chấp nhận.`,
  }
}

export function getVisitAvailability(state: GameSnapshot, playerId: string): string | null {
  const player = getMockPlayer(playerId)
  if (!player) return 'Không tìm thấy hồ sơ người chơi.'
  if (player.visitPermission === 'friends' && !state.friendIds.includes(player.id)) {
    return 'Đảo này chỉ đón bạn bè. Hãy kết bạn trước.'
  }
  if (!islandDefinitions.some((island) => island.id === player.homeIslandId)) return 'Đảo này không khả dụng.'
  if (state.character.currentLocationId === player.homeIslandId) return 'Bạn đang ở hòn đảo này.'
  if (isBusy(state)) return 'Hãy chờ hoạt động hiện tại hoàn tất trước khi thăm đảo.'
  return null
}

export function visitPlayerIsland(state: GameSnapshot, playerId: string): SocialActionResult {
  const issue = getVisitAvailability(state, playerId)
  if (issue) return { ok: false, message: issue }
  const player = getMockPlayer(playerId)
  if (!player) return { ok: false, message: 'Không tìm thấy hồ sơ người chơi.' }
  const island = islandDefinitions.find((entry) => entry.id === player.homeIslandId)
  if (!island) return { ok: false, message: 'Không tìm thấy hòn đảo của người chơi.' }
  return {
    ok: true,
    state: {
      ...state,
      character: { ...state.character, currentLocationId: island.id },
      discoveredIslandIds: [...new Set([...state.discoveredIslandIds, island.id])],
    },
    message: `Đã đến thăm đảo của ${player.name}: ${island.name}.`,
  }
}

export function returnToHomeIsland(state: GameSnapshot): SocialActionResult {
  if (state.character.currentLocationId === state.character.homeIslandId) {
    return { ok: false, message: 'Bạn đang ở đảo nhà.' }
  }
  if (isBusy(state)) return { ok: false, message: 'Hãy chờ hoạt động hiện tại hoàn tất trước khi rời đảo.' }
  return {
    ok: true,
    state: {
      ...state,
      character: { ...state.character, currentLocationId: state.character.homeIslandId },
    },
    message: 'Đã trở về đảo nhà.',
  }
}

function countItem(slots: { itemId: ItemId; quantity: number }[], itemId: ItemId): number {
  return slots.filter((slot) => slot.itemId === itemId).reduce((total, slot) => total + slot.quantity, 0)
}

export function getTradeAvailability(
  state: GameSnapshot,
  playerId: string,
  offeredItemId: ItemId,
  offeredQuantity: number,
  requestedItemId: ItemId,
  requestedQuantity: number,
): string | null {
  const player = getMockPlayer(playerId)
  if (!player) return 'Không tìm thấy hồ sơ người chơi.'
  if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi giao dịch.'
  if (!state.friendIds.includes(player.id)) return 'Chỉ có thể giao dịch với bạn bè.'
  if (state.character.currentLocationId !== player.homeIslandId) return 'Cần đang ở cùng hòn đảo để giao dịch.'
  if (isBusy(state)) return 'Hãy chờ hoạt động hiện tại hoàn tất trước khi giao dịch.'
  if (!itemDefinitions[offeredItemId].tradable || !itemDefinitions[requestedItemId].tradable) {
    return 'Vật phẩm này chỉ dành cho sưu tầm, không thể giao dịch.'
  }
  if (!Number.isInteger(offeredQuantity) || offeredQuantity < 1
    || !Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
    return 'Số lượng giao dịch phải là số nguyên lớn hơn 0.'
  }
  if (countItem(state.inventory.slots, offeredItemId) < offeredQuantity) return 'Bạn không đủ vật phẩm để đưa ra đề nghị.'
  const playerInventory = state.socialPlayerInventories.find((entry) => entry.playerId === player.id)
  if (!playerInventory || countItem(playerInventory.slots, requestedItemId) < requestedQuantity) {
    return 'Người chơi này không có đủ vật phẩm được yêu cầu.'
  }
  if (state.tradeOffers.filter((offer) => offer.status === 'pending').length >= 5) {
    return 'Đã có quá nhiều giao dịch đang chờ xác nhận.'
  }
  return null
}

export function proposeTrade(
  state: GameSnapshot,
  playerId: string,
  offeredItemId: ItemId,
  offeredQuantity: number,
  requestedItemId: ItemId,
  requestedQuantity: number,
  now: number,
): SocialActionResult {
  const issue = getTradeAvailability(
    state, playerId, offeredItemId, offeredQuantity, requestedItemId, requestedQuantity,
  )
  if (issue) return { ok: false, message: issue }
  const player = getMockPlayer(playerId)
  if (!player) return { ok: false, message: 'Không tìm thấy hồ sơ người chơi.' }

  const offer: SocialTradeOffer = {
    id: `trade-${now}-${state.tradeOffers.length + 1}`,
    playerId,
    offered: { itemId: offeredItemId, quantity: offeredQuantity },
    requested: { itemId: requestedItemId, quantity: requestedQuantity },
    status: 'pending',
    createdAt: now,
    resolvedAt: null,
  }
  return {
    ok: true,
    state: { ...state, tradeOffers: [...state.tradeOffers, offer].slice(-100) },
    message: `Đã gửi đề nghị giao dịch cho ${player.name}; vật phẩm chưa bị chuyển.`,
  }
}

export function resolveTrade(
  state: GameSnapshot,
  offerId: string,
  accepted: boolean,
  now: number,
): SocialActionResult {
  const offer = state.tradeOffers.find((entry) => entry.id === offerId)
  if (!offer || offer.status !== 'pending') return { ok: false, message: 'Đề nghị không còn chờ xác nhận.' }
  const player = getMockPlayer(offer.playerId)
  if (!player) return { ok: false, message: 'Không tìm thấy hồ sơ người chơi.' }

  if (!accepted) {
    return {
      ok: true,
      state: {
        ...state,
        tradeOffers: state.tradeOffers.map((entry) => entry.id === offerId
          ? { ...entry, status: 'declined', resolvedAt: now }
          : entry),
      },
      message: `Người chơi mô phỏng đã từ chối đề nghị của ${player.name}.`,
    }
  }

  if (state.character.status !== 'alive'
    || !state.friendIds.includes(player.id)
    || state.character.currentLocationId !== player.homeIslandId
    || isBusy(state)
    || !itemDefinitions[offer.offered.itemId].tradable
    || !itemDefinitions[offer.requested.itemId].tradable) {
    return { ok: false, message: 'Không thể xác nhận: quyền giao dịch hoặc địa điểm đã thay đổi.' }
  }
  const playerEntry = state.socialPlayerInventories.find((entry) => entry.playerId === player.id)
  if (!playerEntry || countItem(state.inventory.slots, offer.offered.itemId) < offer.offered.quantity
    || countItem(playerEntry.slots, offer.requested.itemId) < offer.requested.quantity) {
    return { ok: false, message: 'Không thể xác nhận: số lượng vật phẩm đã thay đổi.' }
  }

  const reducedPlayer = removeItems(playerEntry.slots.length > 0
    ? { ownerId: player.id, slots: playerEntry.slots, maxSlots: 24 }
    : { ownerId: player.id, slots: [], maxSlots: 24 }, offer.requested.itemId, offer.requested.quantity)
  if (!reducedPlayer.ok) return { ok: false, message: 'Không thể lấy vật phẩm từ người chơi mô phỏng.' }
  const reducedInventory = removeItems(state.inventory, offer.offered.itemId, offer.offered.quantity)
  if (!reducedInventory.ok) return { ok: false, message: 'Không thể tiêu hao vật phẩm đã đề nghị.' }
  const newInventory = addItems(reducedInventory.container, offer.requested.itemId, offer.requested.quantity)
  if (!newInventory.ok) return { ok: false, message: 'Túi đồ không đủ chỗ nhận giao dịch.' }
  const newPlayerInventory = addItems(reducedPlayer.container, offer.offered.itemId, offer.offered.quantity)
  if (!newPlayerInventory.ok) return { ok: false, message: 'Kho người chơi mô phỏng không đủ chỗ.' }

  return {
    ok: true,
    state: {
      ...state,
      inventory: newInventory.container,
      socialPlayerInventories: state.socialPlayerInventories.map((entry) => entry.playerId === player.id
        ? { ...entry, slots: newPlayerInventory.container.slots }
        : entry),
      tradeOffers: state.tradeOffers.map((entry) => entry.id === offerId
        ? { ...entry, status: 'accepted', resolvedAt: now }
        : entry),
    },
    message: `Giao dịch với ${player.name} hoàn tất; cả hai phía đã xác nhận mô phỏng.`,
  }
}

export { mockPlayers }
