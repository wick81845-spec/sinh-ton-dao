import type { GameSnapshot, FishingRodItemId } from '../../shared/types/game'

export interface FishingRodDefinition {
  itemId: FishingRodItemId
  tier: number
  name: string
  description: string
  maxDurability: number
  tensionResistance: number
  reelSpeed: number
  image: string
}

export const fishingRodCatalog = [
  {
    itemId: 'item_fishing_rod',
    tier: 1,
    name: 'Cần câu thô',
    description: 'Cần câu đơn giản bằng cành cây và dây bện.',
    maxDurability: 12,
    tensionResistance: 0,
    reelSpeed: 1,
    image: '/assets/fishing/rods/rod-1.png',
  },
  {
    itemId: 'item_fishing_rod_2',
    tier: 2,
    name: 'Cần câu gia cố',
    description: 'Cần gỗ chắc hơn, chịu được những cú giật mạnh.',
    maxDurability: 18,
    tensionResistance: 0.06,
    reelSpeed: 1.04,
    image: '/assets/fishing/rods/rod-2.png',
  },
  {
    itemId: 'item_fishing_rod_3',
    tier: 3,
    name: 'Cần câu composite',
    description: 'Cần nhẹ và dẻo, giúp thu dây nhanh hơn.',
    maxDurability: 25,
    tensionResistance: 0.12,
    reelSpeed: 1.08,
    image: '/assets/fishing/rods/rod-3.png',
  },
  {
    itemId: 'item_fishing_rod_4',
    tier: 4,
    name: 'Cần câu đồng',
    description: 'Cần có khớp đồng bền bỉ, kiểm soát dây tốt.',
    maxDurability: 34,
    tensionResistance: 0.18,
    reelSpeed: 1.12,
    image: '/assets/fishing/rods/rod-4.png',
  },
  {
    itemId: 'item_fishing_rod_5',
    tier: 5,
    name: 'Cần câu thép',
    description: 'Cần chắc khỏe dành cho cá lớn và vùng nước sâu.',
    maxDurability: 45,
    tensionResistance: 0.24,
    reelSpeed: 1.16,
    image: '/assets/fishing/rods/rod-5.png',
  },
  {
    itemId: 'item_fishing_rod_6',
    tier: 6,
    name: 'Cần câu biển sâu',
    description: 'Cần chuyên dụng có lực kéo mạnh và độ bền cao.',
    maxDurability: 58,
    tensionResistance: 0.3,
    reelSpeed: 1.2,
    image: '/assets/fishing/rods/rod-6.png',
  },
  {
    itemId: 'item_fishing_rod_7',
    tier: 7,
    name: 'Cần câu huyền thoại',
    description: 'Cần câu tối thượng, giữ dây ổn định trước cá dữ.',
    maxDurability: 75,
    tensionResistance: 0.36,
    reelSpeed: 1.25,
    image: '/assets/fishing/rods/rod-7.png',
  },
] as const satisfies readonly FishingRodDefinition[]

export function getFishingRod(itemId: FishingRodItemId): FishingRodDefinition {
  const rod = fishingRodCatalog.find((entry) => entry.itemId === itemId)
  if (!rod) throw new Error(`Unknown fishing rod: ${itemId}`)
  return rod
}

export function getBestFishingRod(
  state: Pick<GameSnapshot, 'inventory' | 'itemDurability'>,
): (FishingRodDefinition & { durability: number }) | undefined {
  return fishingRodCatalog
    .filter((rod) => state.inventory.slots.some((slot) => slot.itemId === rod.itemId && slot.quantity > 0))
    .map((rod) => ({ ...rod, durability: state.itemDurability?.[rod.itemId] ?? rod.maxDurability }))
    .filter((rod) => rod.durability > 0)
    .sort((left, right) => right.tier - left.tier)[0]
}
