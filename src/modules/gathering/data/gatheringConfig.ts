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
    id: 'pick-wild-fruit',
    name: 'Hái quả và lá dại',
    description: 'Hái quả chín, lá non và dây leo từ bụi cây.',
    nodeId: 'wild-grove',
    resourceId: 'wild_fruit',
    ordinaryByproducts: [
      { itemId: 'item_plant_fiber', quantity: [1, 2], chance: 0.55 },
      { itemId: 'item_wild_herb', quantity: [1, 1], chance: 0.3 },
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
      { itemId: 'item_plant_fiber', quantity: [1, 2], chance: 0.45 },
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
    ],
    luckyDrop: { itemId: 'item_shrimp', quantity: [2, 3], chance: 1 },
    adverseMessage: 'Một con cua kẹp vào tay bạn, mất 30 giây xử lý vết kẹp.',
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
