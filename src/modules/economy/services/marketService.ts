import { itemDefinitions } from '../../../data/items/itemDefinitions'
import type { GameSnapshot, ItemId } from '../../../shared/types/game'
import { addItems, removeItems } from '../../inventory/services/inventoryService'
import { getMarketListing, isMarketAvailableAt } from '../data/marketDefinitions'

export type MarketActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

function getMarketIssue(state: GameSnapshot): string | null {
  if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi giao dịch.'
  if (state.activeCombat) return 'Không thể giao dịch trong khi chiến đấu.'
  if (!isMarketAvailableAt(state.character.currentLocationId)) return 'Chợ không có mặt tại hòn đảo này.'
  if (state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
    return 'Không thể giao dịch khi đang trên hành trình.'
  }
  return null
}

export function buyMarketItem(state: GameSnapshot, itemId: ItemId): MarketActionResult {
  const issue = getMarketIssue(state)
  if (issue) return { ok: false, message: issue }
  if (!itemDefinitions[itemId].tradable) return { ok: false, message: 'Vật phẩm này chỉ dành cho sưu tầm, không thể giao dịch.' }
  const listing = getMarketListing(itemId, state.character.currentLocationId)
  if (!listing) return { ok: false, message: 'Vật phẩm này không được giao dịch tại chợ.' }
  const coins = state.character.coins ?? 0
  if (coins < listing.buyPrice) return { ok: false, message: 'Không đủ xu để mua vật phẩm này.' }
  const inventory = addItems(state.inventory, itemId, 1)
  if (!inventory.ok) return { ok: false, message: 'Túi đồ đã đầy; hãy dọn chỗ trước khi mua.' }
  return {
    ok: true,
    state: {
      ...state,
      character: { ...state.character, coins: coins - listing.buyPrice },
      inventory: inventory.container,
    },
    message: `Đã mua ${itemDefinitions[itemId].name} với giá ${listing.buyPrice} xu.`,
  }
}

export function sellMarketItem(state: GameSnapshot, itemId: ItemId, quantity: number): MarketActionResult {
  const issue = getMarketIssue(state)
  if (issue) return { ok: false, message: issue }
  if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, message: 'Số lượng bán phải là số nguyên lớn hơn 0.' }
  if (!itemDefinitions[itemId].tradable) return { ok: false, message: 'Vật phẩm này chỉ dành cho sưu tầm, không thể giao dịch.' }
  const listing = getMarketListing(itemId, state.character.currentLocationId)
  if (!listing) return { ok: false, message: 'Vật phẩm này không được giao dịch tại chợ.' }
  const inventory = removeItems(state.inventory, itemId, quantity)
  if (!inventory.ok) return { ok: false, message: 'Không đủ vật phẩm trong túi để bán.' }
  const proceeds = listing.sellPrice * quantity
  return {
    ok: true,
    state: {
      ...state,
      character: { ...state.character, coins: (state.character.coins ?? 0) + proceeds },
      inventory: inventory.container,
    },
    message: `Đã bán ${itemDefinitions[itemId].name} × ${quantity}, nhận ${proceeds} xu.`,
  }
}
