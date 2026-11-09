import type { InventorySlot } from '../../../shared/types/game'

export interface MockPlayerProfile {
  id: string
  name: string
  level: number
  title: string
  homeIslandId: string
  status: 'online' | 'away'
  visitPermission: 'public' | 'friends'
  reputation: number
  bio: string
  startingInventory: InventorySlot[]
}

export const mockPlayers: readonly MockPlayerProfile[] = [
  {
    id: 'player_sora',
    name: 'Sora',
    level: 4,
    title: 'Người giữ rừng',
    homeIslandId: 'island_002',
    status: 'online',
    visitPermission: 'public',
    reputation: 78,
    bio: 'Đang dựng căn cứ nhỏ giữa rừng và trao đổi tài nguyên.',
    startingInventory: [
      { itemId: 'item_wood', quantity: 6 },
      { itemId: 'item_stone', quantity: 4 },
      { itemId: 'item_wild_fruit', quantity: 4 },
    ],
  },
  {
    id: 'player_mina',
    name: 'Mina',
    level: 6,
    title: 'Nhà thám hiểm',
    homeIslandId: 'island_003',
    status: 'away',
    visitPermission: 'friends',
    reputation: 91,
    bio: 'Ưa thích khám phá những dấu tích cổ ngoài khơi.',
    startingInventory: [
      { itemId: 'item_wood', quantity: 3 },
      { itemId: 'item_stone', quantity: 10 },
      { itemId: 'item_wild_fruit', quantity: 2 },
    ],
  },
]

export function getMockPlayer(playerId: string): MockPlayerProfile | undefined {
  return mockPlayers.find((player) => player.id === playerId)
}
