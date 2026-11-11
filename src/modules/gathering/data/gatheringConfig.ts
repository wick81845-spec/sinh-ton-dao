import type { ItemId, ResourceNodeState } from '../../../shared/types/game'
import { getResourceDefinition } from '../../../data/resources/resourceDefinitions'

type PlayableResourceDefinition = Omit<NonNullable<ReturnType<typeof getResourceDefinition>>, 'inventoryItemId'> & {
  inventoryItemId: ItemId
}

export type GatheringUnlockStage = 'starter' | 'exploration' | 'tool'

export interface GatheringDrop {
  itemId: ItemId
  quantity: [number, number]
  chance: number
}

export interface ResourceNodeDefinition {
  id: string
  name: string
  description: string
  locationId: string
  capacity: number
  respawnSeconds: number
  resourceId: string
  unlockStage: GatheringUnlockStage
}

export interface GatheringActivityDefinition {
  id: string
  name: string
  description: string
  nodeId: string
  resourceId: string
  ordinaryByproducts: GatheringDrop[]
  luckyDrop: GatheringDrop
  adverseMessage: string
}

export const randomGatheringActivityId = 'random-gathering'

export const gatheringOutcomeChances = {
  adverse: 0.1,
  lucky: 0.15,
} as const

export const resourceNodeDefinitions: readonly ResourceNodeDefinition[] = [
  {
    id: 'shoreline',
    name: 'Bãi biển',
    description: 'Gỗ trôi dạt, vỏ sò và rong biển theo thủy triều.',
    locationId: 'island_001',
    capacity: 30,
    respawnSeconds: 120,
    resourceId: 'driftwood',
    unlockStage: 'starter',
  },
  {
    id: 'sea-water',
    name: 'Bờ nước biển',
    description: 'Thu nước biển để kết tinh muối.',
    locationId: 'island_001',
    capacity: 24,
    respawnSeconds: 120,
    resourceId: 'sea_water',
    unlockStage: 'starter',
  },
  {
    id: 'wild-grove',
    name: 'Bụi cây',
    description: 'Quả dại, lá non và dây leo mọc thành bụi.',
    locationId: 'island_001',
    capacity: 18,
    respawnSeconds: 90,
    resourceId: 'wild_fruit',
    unlockStage: 'starter',
  },
  {
    id: 'forest-edge',
    name: 'Bìa rừng',
    description: 'Cây thân mềm và nấm mọc ở rìa rừng. Chặt gỗ cần rìu.',
    locationId: 'island_001',
    capacity: 24,
    respawnSeconds: 240,
    resourceId: 'wood_soft',
    unlockStage: 'exploration',
  },
  {
    id: 'rocky-outcrop',
    name: 'Mỏm đá',
    description: 'Đá cuội, đá thô và sỏi lộ ra trên sườn đá.',
    locationId: 'island_001',
    capacity: 20,
    respawnSeconds: 180,
    resourceId: 'pebble',
    unlockStage: 'exploration',
  },
  {
    id: 'palm-grove',
    name: 'Rừng dừa',
    description: 'Dừa chín, lá cọ và sợi thực vật dưới tán dừa.',
    locationId: 'island_001',
    capacity: 18,
    respawnSeconds: 180,
    resourceId: 'palm_leaf',
    unlockStage: 'starter',
  },
  {
    id: 'fallen-tree',
    name: 'Khu cây đổ',
    description: 'Thân cây mục, cành khô, vỏ cây và nấm rừng.',
    locationId: 'island_001',
    capacity: 22,
    respawnSeconds: 240,
    resourceId: 'rotten_wood',
    unlockStage: 'tool',
  },
  {
    id: 'freshwater-stream',
    name: 'Suối nước',
    description: 'Nước ngọt, sỏi và thảo mộc mọc dọc bờ suối.',
    locationId: 'island_001',
    capacity: 24,
    respawnSeconds: 150,
    resourceId: 'fresh_water',
    unlockStage: 'tool',
  },
  {
    id: 'tidal-rocks',
    name: 'Bãi đá ven biển',
    description: 'Cua, tôm và rong biển mắc lại trong các hốc đá.',
    locationId: 'island_001',
    capacity: 18,
    respawnSeconds: 180,
    resourceId: 'crab',
    unlockStage: 'tool',
  },
  {
    id: 'iron-deposit',
    name: 'Mạch quặng sắt',
    description: 'Mạch quặng lộ thiên trên đảo đá; cần cuốc chim để khai thác.',
    locationId: 'island_004',
    capacity: 16,
    respawnSeconds: 300,
    resourceId: 'iron_ore',
    unlockStage: 'tool',
  },
  {
    id: 'copper-deposit',
    name: 'Mạch quặng đồng',
    description: 'Quặng đồng nằm sâu trong vách đá.',
    locationId: 'island_004',
    capacity: 14,
    respawnSeconds: 360,
    resourceId: 'copper_ore',
    unlockStage: 'tool',
  },
  {
    id: 'tin-deposit',
    name: 'Mạch quặng thiếc',
    description: 'Mạch thiếc hiếm dùng để pha hợp kim đồng thiếc.',
    locationId: 'island_004',
    capacity: 10,
    respawnSeconds: 420,
    resourceId: 'tin_ore',
    unlockStage: 'tool',
  },
  {
    id: 'coal-seam',
    name: 'Vỉa than',
    description: 'Vỉa than đá cung cấp nhiên liệu cho lò luyện.',
    locationId: 'island_004',
    capacity: 18,
    respawnSeconds: 300,
    resourceId: 'coal',
    unlockStage: 'tool',
  },
  {
    id: 'riverbank-clay',
    name: 'Bờ sông đất sét',
    description: 'Đất sét mềm lắng đọng dọc bờ sông trên đảo rừng.',
    locationId: 'island_002',
    capacity: 20,
    respawnSeconds: 240,
    resourceId: 'clay',
    unlockStage: 'exploration',
  },
  {
    id: 'old-growth-forest',
    name: 'Rừng cổ thụ',
    description: 'Cổ thụ thân cứng chỉ có thể đốn bằng rìu sắt.',
    locationId: 'island_002',
    capacity: 12,
    respawnSeconds: 480,
    resourceId: 'wood_hard',
    unlockStage: 'tool',
  },
  {
    id: 'resin-tree',
    name: 'Cây lấy nhựa',
    description: 'Cây cổ thụ có thể lấy nhựa mà không cần đốn hạ.',
    locationId: 'island_002',
    capacity: 12,
    respawnSeconds: 480,
    resourceId: 'tree_resin',
    unlockStage: 'exploration',
  },
  {
    id: 'bee-hive',
    name: 'Tổ ong',
    description: 'Tổ ong rừng chứa mật có thể thu hoạch.',
    locationId: 'island_002',
    capacity: 8,
    respawnSeconds: 600,
    resourceId: 'honey',
    unlockStage: 'exploration',
  },
]

export const gatheringActivities: readonly GatheringActivityDefinition[] = [
  {
    id: 'shore-fishing',
    name: 'Câu cá ven bờ',
    description: 'Thả câu, chờ cá cắn mồi rồi kéo lên. Loài cá thay đổi theo vùng biển và thời tiết.',
    nodeId: 'fishing-ground',
    resourceId: 'fish',
    ordinaryByproducts: [],
    luckyDrop: { itemId: 'item_seashell', quantity: [1, 1], chance: 1 },
    adverseMessage: 'Sóng đánh ướt dụng cụ, bạn mất thêm thời gian.',
  },
  {
    id: 'spear-fishing',
    name: 'Đánh cá bằng lao',
    description: 'Canh cá nhỏ ở vùng ven bờ hoặc rạn san hô rồi phóng lao bắt cá.',
    nodeId: 'fishing-ground',
    resourceId: 'fish',
    ordinaryByproducts: [],
    luckyDrop: { itemId: 'item_seashell', quantity: [1, 1], chance: 1 },
    adverseMessage: 'Sóng làm cá hoảng sợ, bạn mất thêm thời gian.',
  },
  {
    id: 'collect-driftwood',
    name: 'Nhặt tài nguyên bãi biển',
    description: 'Nhặt gỗ trôi dạt và tìm vật liệu nhỏ dọc bờ biển.',
    nodeId: 'shoreline',
    resourceId: 'driftwood',
    ordinaryByproducts: [
      { itemId: 'item_seashell', quantity: [1, 2], chance: 0.65 },
      { itemId: 'item_seaweed', quantity: [1, 2], chance: 0.45 },
    ],
    luckyDrop: { itemId: 'item_crab', quantity: [1, 1], chance: 1 },
    adverseMessage: 'Bạn bị cứa nhẹ vào tay bởi vỏ sò sắc, mất 30 giây xử lý vết thương.',
  },
  {
    id: 'collect-seawater',
    name: 'Thu nước biển',
    description: 'Múc nước biển ở bờ để đem đi kết tinh muối.',
    nodeId: 'sea-water',
    resourceId: 'sea_water',
    ordinaryByproducts: [],
    luckyDrop: { itemId: 'item_seashell', quantity: [1, 1], chance: 1 },
    adverseMessage: 'Sóng tạt vào người khiến bạn mất thêm thời gian.',
  },
  {
    id: 'pick-wild-fruit',
    name: 'Hái quả và lá dại',
    description: 'Hái quả chín, lá non và dây leo từ bụi cây.',
    nodeId: 'wild-grove',
    resourceId: 'wild_fruit',
    ordinaryByproducts: [
      { itemId: 'item_plant_fiber', quantity: [1, 2], chance: 0.55 },
      { itemId: 'item_wild_herb', quantity: [1, 1], chance: 0.3 },
      { itemId: 'item_fruit_seed', quantity: [1, 1], chance: 0.2 },
      { itemId: 'item_herb_seed', quantity: [1, 1], chance: 0.12 },
      { itemId: 'item_chicken', quantity: [1, 1], chance: 0.03 },
      { itemId: 'item_goat', quantity: [1, 1], chance: 0.015 },
    ],
    luckyDrop: { itemId: 'item_coconut', quantity: [1, 2], chance: 1 },
    adverseMessage: 'Bụi cây có gai làm bạn xây xát, mất 30 giây nghỉ tay.',
  },
  {
    id: 'chop-forest-wood',
    name: 'Chặt gỗ mềm',
    description: 'Dùng rìu khai thác gỗ mềm; đôi khi tìm thấy cành và nấm.',
    nodeId: 'forest-edge',
    resourceId: 'wood_soft',
    ordinaryByproducts: [
      { itemId: 'item_branch', quantity: [1, 2], chance: 0.6 },
      { itemId: 'item_wild_mushroom', quantity: [1, 1], chance: 0.25 },
      { itemId: 'item_bark', quantity: [1, 1], chance: 0.35 },
    ],
    luckyDrop: { itemId: 'item_wild_mushroom', quantity: [2, 3], chance: 1 },
    adverseMessage: 'Rìu mắc vào thân cây, bạn mất 30 giây gỡ ra.',
  },
  {
    id: 'collect-stones',
    name: 'Nhặt đá ở mỏm đá',
    description: 'Gom đá cuội, sỏi và mảnh đá thô trên sườn đá.',
    nodeId: 'rocky-outcrop',
    resourceId: 'pebble',
    ordinaryByproducts: [
      { itemId: 'item_rough_stone', quantity: [1, 2], chance: 0.5 },
      { itemId: 'item_gravel', quantity: [1, 2], chance: 0.45 },
    ],
    luckyDrop: { itemId: 'item_rough_stone', quantity: [2, 3], chance: 1 },
    adverseMessage: 'Đá vụn trượt dưới chân, bạn bị đau nhẹ và mất 30 giây.',
  },
  {
    id: 'collect-palm-grove',
    name: 'Thu hoạch rừng dừa',
    description: 'Nhặt dừa rụng và lấy lá cọ, sợi thực vật.',
    nodeId: 'palm-grove',
    resourceId: 'palm_leaf',
    ordinaryByproducts: [
      { itemId: 'item_coconut', quantity: [1, 2], chance: 0.5 },
      { itemId: 'item_plant_fiber', quantity: [1, 2], chance: 1 },
      { itemId: 'item_coconut_seed', quantity: [1, 1], chance: 0.08 },
    ],
    luckyDrop: { itemId: 'item_coconut', quantity: [2, 3], chance: 1 },
    adverseMessage: 'Một quả dừa rơi sượt qua bạn, mất 30 giây để bình tĩnh lại.',
  },
  {
    id: 'collect-fallen-tree',
    name: 'Nhặt vật liệu cây đổ',
    description: 'Tận dụng gỗ mục và tìm vỏ cây, cành khô, nấm rừng.',
    nodeId: 'fallen-tree',
    resourceId: 'rotten_wood',
    ordinaryByproducts: [
      { itemId: 'item_branch', quantity: [1, 2], chance: 0.5 },
      { itemId: 'item_bark', quantity: [1, 2], chance: 0.45 },
      { itemId: 'item_wild_mushroom', quantity: [1, 1], chance: 0.25 },
      { itemId: 'item_poisonous_mushroom', quantity: [1, 1], chance: 0.04 },
    ],
    luckyDrop: { itemId: 'item_honey', quantity: [1, 1], chance: 1 },
    adverseMessage: 'Côn trùng trong thân cây đốt bạn, mất 30 giây xử lý vết đốt.',
  },
  {
    id: 'collect-stream-water',
    name: 'Lấy nước suối',
    description: 'Lấy nước ngọt và tìm sỏi, thảo mộc quanh bờ suối.',
    nodeId: 'freshwater-stream',
    resourceId: 'fresh_water',
    ordinaryByproducts: [
      { itemId: 'item_gravel', quantity: [1, 2], chance: 0.45 },
      { itemId: 'item_wild_herb', quantity: [1, 2], chance: 0.35 },
    ],
    luckyDrop: { itemId: 'item_wild_herb', quantity: [2, 3], chance: 1 },
    adverseMessage: 'Bờ suối trơn trượt, bạn bị xây xát và mất 30 giây.',
  },
  {
    id: 'collect-tidal-rocks',
    name: 'Tìm hải sản ở bãi đá',
    description: 'Tìm cua, tôm và rong biển trong các hốc đá khi thủy triều rút.',
    nodeId: 'tidal-rocks',
    resourceId: 'crab',
    ordinaryByproducts: [
      { itemId: 'item_shrimp', quantity: [1, 2], chance: 0.45 },
      { itemId: 'item_seaweed', quantity: [1, 2], chance: 0.4 },
      { itemId: 'item_seashell', quantity: [1, 1], chance: 0.3 },
      { itemId: 'item_sea_salt', quantity: [1, 1], chance: 0.15 },
    ],
    luckyDrop: { itemId: 'item_shrimp', quantity: [2, 3], chance: 1 },
    adverseMessage: 'Một con cua kẹp vào tay bạn, mất 30 giây xử lý vết kẹp.',
  },
  {
    id: 'mine-iron-ore',
    name: 'Khai thác quặng sắt',
    description: 'Dùng cuốc chim đá để khai thác quặng sắt trên đảo đá.',
    nodeId: 'iron-deposit',
    resourceId: 'iron_ore',
    ordinaryByproducts: [{ itemId: 'item_rough_stone', quantity: [1, 2], chance: 0.4 }],
    luckyDrop: { itemId: 'item_iron_ore', quantity: [2, 3], chance: 1 },
    adverseMessage: 'Đá văng từ mạch quặng làm bạn bị thương nhẹ.',
  },
  {
    id: 'mine-copper-ore',
    name: 'Khai thác quặng đồng',
    description: 'Tách quặng đồng khỏi vách đá bằng cuốc chim.',
    nodeId: 'copper-deposit',
    resourceId: 'copper_ore',
    ordinaryByproducts: [{ itemId: 'item_rough_stone', quantity: [1, 2], chance: 0.4 }],
    luckyDrop: { itemId: 'item_copper_ore', quantity: [2, 3], chance: 1 },
    adverseMessage: 'Một mảnh đá sắc cứa vào tay bạn.',
  },
  {
    id: 'mine-tin-ore',
    name: 'Khai thác quặng thiếc',
    description: 'Tìm và tách các hạt thiếc hiếm trong đá.',
    nodeId: 'tin-deposit',
    resourceId: 'tin_ore',
    ordinaryByproducts: [{ itemId: 'item_rough_stone', quantity: [1, 2], chance: 0.5 }],
    luckyDrop: { itemId: 'item_tin_ore', quantity: [2, 3], chance: 1 },
    adverseMessage: 'Đá vụn trượt khỏi vách và làm bạn mất thời gian.',
  },
  {
    id: 'mine-coal',
    name: 'Đào than đá',
    description: 'Đào than từ vỉa để làm nhiên liệu cho lò.',
    nodeId: 'coal-seam',
    resourceId: 'coal',
    ordinaryByproducts: [{ itemId: 'item_rough_stone', quantity: [1, 1], chance: 0.3 }],
    luckyDrop: { itemId: 'item_coal', quantity: [2, 3], chance: 1 },
    adverseMessage: 'Bụi than khiến bạn phải dừng lại để lấy hơi.',
  },
  {
    id: 'dig-clay',
    name: 'Đào đất sét',
    description: 'Đào đất sét giàu khoáng chất dọc bờ sông.',
    nodeId: 'riverbank-clay',
    resourceId: 'clay',
    ordinaryByproducts: [{ itemId: 'item_gravel', quantity: [1, 2], chance: 0.25 }],
    luckyDrop: { itemId: 'item_clay', quantity: [2, 3], chance: 1 },
    adverseMessage: 'Bờ sông lầy khiến bạn mất thời gian rửa sạch dụng cụ.',
  },
  {
    id: 'chop-hardwood',
    name: 'Đốn gỗ cứng',
    description: 'Dùng rìu sắt đốn gỗ già chắc trên đảo rừng.',
    nodeId: 'old-growth-forest',
    resourceId: 'wood_hard',
    ordinaryByproducts: [{ itemId: 'item_branch', quantity: [1, 2], chance: 0.3 }],
    luckyDrop: { itemId: 'item_wood_hard', quantity: [2, 3], chance: 1 },
    adverseMessage: 'Cành gỗ nặng rơi xuống làm bạn bị thương nhẹ.',
  },
  {
    id: 'tap-tree-resin',
    name: 'Thu nhựa cây',
    description: 'Rạch nhẹ vỏ cây cổ thụ và hứng nhựa mà không làm đổ cây.',
    nodeId: 'resin-tree',
    resourceId: 'tree_resin',
    ordinaryByproducts: [],
    luckyDrop: { itemId: 'item_tree_resin', quantity: [1, 1], chance: 1 },
    adverseMessage: 'Nhựa dính vào tay, bạn mất thêm thời gian làm sạch.',
  },
  {
    id: 'collect-honey',
    name: 'Thu mật ong',
    description: 'Thu mật từ tổ ong rừng ở những đảo có rừng phù hợp.',
    nodeId: 'bee-hive',
    resourceId: 'honey',
    ordinaryByproducts: [],
    luckyDrop: { itemId: 'item_honey', quantity: [1, 1], chance: 1 },
    adverseMessage: 'Ong đốt bạn khi tiếp cận tổ, mất 30 giây xử lý vết đốt.',
  },
]

export const initialResourceNodes: ResourceNodeState[] = resourceNodeDefinitions.map((node) => ({
  nodeId: node.id,
  available: node.capacity,
  respawnAt: null,
}))

export function getGatheringActivityData(activityId: string): {
  activity: GatheringActivityDefinition
  resource: PlayableResourceDefinition
  node: ResourceNodeDefinition
} | undefined {
  const activity = gatheringActivities.find((entry) => entry.id === activityId)
  if (!activity) return undefined
  const resource = getResourceDefinition(activity.resourceId)
  if (!resource) return undefined
  const inventoryItemId = resource.inventoryItemId
  if (inventoryItemId === null) return undefined
  const node = resourceNodeDefinitions.find((entry) => entry.id === activity.nodeId)
  if (!node || node.resourceId !== resource.id) return undefined
  return {
    activity,
    resource: { ...resource, inventoryItemId },
    node,
  }
}
