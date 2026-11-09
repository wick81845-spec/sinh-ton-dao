import type { ItemQuantity } from '../../../shared/types/game'

export interface BuildingDefinition {
  id: string
  name: string
  description: string
  maxLevel: number
  maxHealth: number
  constructionCost: ItemQuantity[]
  constructionDurationSeconds: number
  upgradeCosts: Partial<Record<number, ItemQuantity[]>>
  upgradeDurationSeconds: Partial<Record<number, number>>
}

export const constructionQueueLimit = 2

export const buildingDefinitions: readonly BuildingDefinition[] = [
  {
    id: 'building_workbench',
    name: 'Bàn chế tạo',
    description: 'Mở khóa những công thức cần dụng cụ chế tác.',
    maxLevel: 2,
    maxHealth: 100,
    constructionCost: [
      { itemId: 'item_wood', quantity: 8 },
      { itemId: 'item_stone', quantity: 3 },
    ],
    constructionDurationSeconds: 6,
    upgradeCosts: {
      2: [{ itemId: 'item_wood', quantity: 4 }, { itemId: 'item_stone', quantity: 2 }],
    },
    upgradeDurationSeconds: { 2: 8 },
  },
  {
    id: 'building_kiln',
    name: 'Lò nung',
    description: 'Lò đất đơn giản để nung gỗ thành than củi và xử lý vật liệu.',
    maxLevel: 2,
    maxHealth: 140,
    constructionCost: [
      { itemId: 'item_wood_plank', quantity: 4 },
      { itemId: 'item_stone', quantity: 6 },
    ],
    constructionDurationSeconds: 14,
    upgradeCosts: {
      2: [{ itemId: 'item_wood_plank', quantity: 6 }, { itemId: 'item_stone', quantity: 8 }],
    },
    upgradeDurationSeconds: { 2: 20 },
  },
  {
    id: 'building_storage',
    name: 'Rương chứa đồ',
    description: 'Một chiếc rương chắc chắn để cất vật phẩm trên đảo.',
    maxLevel: 3,
    maxHealth: 120,
    constructionCost: [
      { itemId: 'item_wood', quantity: 6 },
      { itemId: 'item_stone', quantity: 4 },
    ],
    constructionDurationSeconds: 8,
    upgradeCosts: {
      2: [{ itemId: 'item_wood', quantity: 8 }, { itemId: 'item_stone', quantity: 4 }],
      3: [{ itemId: 'item_wood', quantity: 12 }, { itemId: 'item_stone', quantity: 6 }],
    },
    upgradeDurationSeconds: { 2: 10, 3: 14 },
  },
  {
    id: 'building_campfire',
    name: 'Lửa trại',
    description: 'Đống đá và cành khô để nhóm lửa; nghỉ gần lửa giúp hồi sức lực nhanh hơn.',
    maxLevel: 1,
    maxHealth: 80,
    constructionCost: [
      { itemId: 'item_branch', quantity: 3 },
      { itemId: 'item_stone', quantity: 2 },
    ],
    constructionDurationSeconds: 5,
    upgradeCosts: {},
    upgradeDurationSeconds: {},
  },
  {
    id: 'building_shelter',
    name: 'Lều lá',
    description: 'Nơi trú tạm đan từ lá cọ và sợi thực vật; nghỉ trong lều hỗ trợ hồi phục sức khỏe.',
    maxLevel: 2,
    maxHealth: 180,
    constructionCost: [
      { itemId: 'item_palm_leaf', quantity: 4 },
      { itemId: 'item_plant_fiber', quantity: 2 },
    ],
    constructionDurationSeconds: 12,
    upgradeCosts: {
      2: [{ itemId: 'item_wood', quantity: 12 }, { itemId: 'item_stone', quantity: 8 }],
    },
    upgradeDurationSeconds: { 2: 16 },
  },
]

export function isBuildingDefinitionId(value: string): value is (typeof buildingDefinitions)[number]['id'] {
  return buildingDefinitions.some((definition) => definition.id === value)
}
