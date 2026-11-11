import type { FishingLootItemId, ItemId } from '../../shared/types/game'

export type FishingLootKind = 'trash' | 'treasure'

export interface FishingLootEntry {
  itemId: FishingLootItemId | Extract<ItemId, 'item_wood'>
  name: string
  description: string
  kind: FishingLootKind
  weight: number
  oceanZones: readonly string[]
  image: string
}

const allZones = ['coastal_water', 'open_ocean', 'shipwreck_zone']

export const fishingLootCatalog: readonly FishingLootEntry[] = [
  {
    itemId: 'item_plastic_bag',
    name: 'Túi nilon',
    description: 'Túi nilon trôi dạt, cần được thu gom để không làm ô nhiễm biển.',
    kind: 'trash',
    weight: 5,
    oceanZones: allZones,
    image: '/assets/fishing/loot/trash/plastic-bag.png',
  },
  {
    itemId: 'item_glass_bottle',
    name: 'Chai thủy tinh',
    description: 'Chai thủy tinh cũ mắc vào lưỡi câu giữa dòng nước.',
    kind: 'trash',
    weight: 4,
    oceanZones: allZones,
    image: '/assets/fishing/loot/trash/glass-bottle.png',
  },
  {
    itemId: 'item_metal_can',
    name: 'Lon kim loại',
    description: 'Chiếc lon rỗng bị vứt xuống biển từ lâu.',
    kind: 'trash',
    weight: 4,
    oceanZones: allZones,
    image: '/assets/fishing/loot/trash/metal-can.png',
  },
  {
    itemId: 'item_old_shoe',
    name: 'Giày dép cũ',
    description: 'Một chiếc giày cũ trôi dạt dưới đáy biển.',
    kind: 'trash',
    weight: 2,
    oceanZones: allZones,
    image: '/assets/fishing/loot/trash/old-shoe.png',
  },
  {
    itemId: 'item_old_rope',
    name: 'Dây thừng cũ',
    description: 'Đoạn dây thừng mục mắc lại dưới đáy biển, có thể tận dụng một phần.',
    kind: 'trash',
    weight: 3,
    oceanZones: allZones,
    image: '/assets/fishing/loot/trash/rope.png',
  },
  {
    itemId: 'item_torn_net',
    name: 'Lưới rách',
    description: 'Mảnh lưới đánh cá bị rách, có thể tái sử dụng một phần.',
    kind: 'trash',
    weight: 3,
    oceanZones: allZones,
    image: '/assets/fishing/loot/trash/torn-net.png',
  },
  {
    itemId: 'item_wood',
    name: 'Gỗ trôi dạt',
    description: 'Khúc gỗ cũ được sóng biển đưa lên theo lưỡi câu.',
    kind: 'trash',
    weight: 3,
    oceanZones: allZones,
    image: '/assets/fishing/loot/trash/driftwood.png',
  },
  {
    itemId: 'item_plastic_scrap',
    name: 'Mảnh nhựa',
    description: 'Mảnh nhựa vụn trôi dạt giữa biển, cần được thu gom.',
    kind: 'trash',
    weight: 4,
    oceanZones: allZones,
    image: '/assets/fishing/loot/trash/plastic-scrap.png',
  },
  {
    itemId: 'item_sunken_crate',
    name: 'Thùng hàng chìm',
    description: 'Thùng hàng được kéo lên từ vùng biển sâu.',
    kind: 'treasure',
    weight: 3,
    oceanZones: ['open_ocean', 'shipwreck_zone'],
    image: '/assets/fishing/loot/treasure/sunken-crate.png',
  },
  {
    itemId: 'item_metal_box',
    name: 'Hộp kim loại',
    description: 'Hộp kim loại kín, mắc lại giữa những tảng đá dưới biển.',
    kind: 'treasure',
    weight: 3,
    oceanZones: ['coastal_water', 'open_ocean', 'shipwreck_zone'],
    image: '/assets/fishing/loot/treasure/metal-box.png',
  },
  {
    itemId: 'item_ship_parts',
    name: 'Bộ phận tàu thuyền',
    description: 'Linh kiện cũ có thể tận dụng để sửa chữa phương tiện.',
    kind: 'treasure',
    weight: 2,
    oceanZones: ['open_ocean', 'shipwreck_zone'],
    image: '/assets/fishing/loot/treasure/ship-parts.png',
  },
  {
    itemId: 'item_message_bottle',
    name: 'Chai chứa thông điệp',
    description: 'Một thông điệp bí ẩn đã vượt qua nhiều ngày trên biển.',
    kind: 'treasure',
    weight: 4,
    oceanZones: allZones,
    image: '/assets/fishing/loot/treasure/message-bottle.png',
  },
  {
    itemId: 'item_small_chest',
    name: 'Rương nhỏ',
    description: 'Chiếc rương nhỏ được tìm thấy gần một xác tàu cũ.',
    kind: 'treasure',
    weight: 2,
    oceanZones: ['shipwreck_zone'],
    image: '/assets/fishing/loot/treasure/small-chest.png',
  },
  {
    itemId: 'item_wreckage_material',
    name: 'Vật liệu quý từ xác tàu',
    description: 'Mảnh vật liệu bền chắc trục vớt từ xác tàu đắm.',
    kind: 'treasure',
    weight: 2,
    oceanZones: ['shipwreck_zone'],
    image: '/assets/fishing/loot/treasure/wreckage-material.png',
  },
  {
    itemId: 'item_ship_cable',
    name: 'Dây cáp tàu đắm',
    description: 'Cuộn cáp chắc chắn được kéo lên từ khu vực xác tàu.',
    kind: 'treasure',
    weight: 2,
    oceanZones: ['open_ocean', 'shipwreck_zone'],
    image: '/assets/fishing/loot/treasure/ship-cable.png',
  },
  {
    itemId: 'item_ship_bell',
    name: 'Chuông tàu đắm',
    description: 'Chiếc chuông phủ rong rêu còn sót lại từ một con tàu cổ.',
    kind: 'treasure',
    weight: 1,
    oceanZones: ['shipwreck_zone'],
    image: '/assets/fishing/loot/treasure/ship-bell.png',
  },
]

export function getFishingLootAvailableAt(oceanZoneId: string): FishingLootEntry[] {
  return fishingLootCatalog.filter((item) => item.oceanZones.includes(oceanZoneId))
}

export function getFishingLootDefinition(itemId: string): FishingLootEntry | undefined {
  return fishingLootCatalog.find((item) => item.itemId === itemId)
}
