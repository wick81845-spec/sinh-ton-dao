import type { ItemId } from '../../../shared/types/game'

export interface MarketListing {
  islandId: string
  itemId: ItemId
  buyPrice: number
  sellPrice: number
}

export const marketListings: readonly MarketListing[] = [
  { islandId: 'island_002', itemId: 'item_wood_soft', buyPrice: 5, sellPrice: 2 },
  { islandId: 'island_002', itemId: 'item_dried_fruit', buyPrice: 6, sellPrice: 3 },
  { islandId: 'island_002', itemId: 'item_wood_plank', buyPrice: 8, sellPrice: 4 },
  { islandId: 'island_002', itemId: 'item_herring', buyPrice: 5, sellPrice: 2 },
  { islandId: 'island_002', itemId: 'item_sturgeon', buyPrice: 12, sellPrice: 6 },
  { islandId: 'island_003', itemId: 'item_stone', buyPrice: 3, sellPrice: 1 },
  { islandId: 'island_003', itemId: 'item_charcoal', buyPrice: 7, sellPrice: 3 },
  { islandId: 'island_003', itemId: 'item_red_snapper', buyPrice: 40, sellPrice: 20 },
  { islandId: 'island_003', itemId: 'item_moray_eel', buyPrice: 40, sellPrice: 20 },
]

export function getMarketListingsAt(islandId: string): readonly MarketListing[] {
  return marketListings.filter((listing) => listing.islandId === islandId)
}

export function isMarketAvailableAt(islandId: string): boolean {
  return getMarketListingsAt(islandId).length > 0
}

export function getMarketListing(itemId: ItemId, islandId: string): MarketListing | undefined {
  return marketListings.find((listing) => listing.itemId === itemId && listing.islandId === islandId)
}
