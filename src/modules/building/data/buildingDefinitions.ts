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
  upgradeRequirements?: Partial<Record<number, {
    requiredLevel?: number
    technologyId?: string
    requiredDiscoveryId?: string
  }>>
  requiredLevel?: number
  technologyId?: string
  requiredDiscoveryId?: string
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
      { itemId: 'item_branch', quantity: 3 },
      { itemId: 'item_rope', quantity: 1 },
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
    description: 'Lò đất thô có thể nâng cấp thành lò gạch để nung và xử lý vật liệu.',
    maxLevel: 2,
    maxHealth: 140,
    constructionCost: [{ itemId: 'item_clay', quantity: 6 }, { itemId: 'item_stone', quantity: 4 }],
    constructionDurationSeconds: 14,
    upgradeCosts: {
      2: [{ itemId: 'item_clay_brick', quantity: 6 }, { itemId: 'item_stone', quantity: 8 }],
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
    description: 'Nơi trú tạm đan từ lá cọ và sợi thực vật; nghỉ trong lều tăng tốc hồi thể lực và sức khỏe. Nâng cấp lều tăng hiệu quả nghỉ.',
    maxLevel: 4,
    maxHealth: 180,
    constructionCost: [
      { itemId: 'item_palm_leaf', quantity: 4 },
      { itemId: 'item_plant_fiber', quantity: 2 },
    ],
    constructionDurationSeconds: 12,
    upgradeCosts: {
      2: [{ itemId: 'item_wood', quantity: 12 }, { itemId: 'item_stone', quantity: 8 }],
      3: [
        { itemId: 'item_wood_hard', quantity: 4 },
        { itemId: 'item_wood_plank', quantity: 12 },
        { itemId: 'item_plant_fiber', quantity: 8 },
      ],
      4: [
        { itemId: 'item_wood_hard', quantity: 8 },
        { itemId: 'item_iron_ingot', quantity: 4 },
        { itemId: 'item_clay_brick', quantity: 8 },
      ],
    },
    upgradeDurationSeconds: { 2: 16, 3: 35, 4: 60 },
    upgradeRequirements: {
      3: { requiredLevel: 5, technologyId: 'tech_island_settlement', requiredDiscoveryId: 'island_002' },
      4: { requiredLevel: 8, technologyId: 'tech_advanced_production', requiredDiscoveryId: 'island_004' },
    },
  },
  {
    id: 'building_drying_rack',
    name: 'Giàn phơi thực phẩm',
    description: 'Hong cá tươi thành cá khô nhẹ, dễ mang theo và bảo quản lâu hơn.',
    maxLevel: 1,
    maxHealth: 100,
    constructionCost: [
      { itemId: 'item_branch', quantity: 4 },
      { itemId: 'item_rope', quantity: 1 },
    ],
    constructionDurationSeconds: 10,
    upgradeCosts: {},
    upgradeDurationSeconds: {},
  },
  {
    id: 'building_rain_collector',
    name: 'Máng hứng nước mưa',
    description: 'Thu nước mưa vào vật chứa; nước thu được cần đun sôi trước khi uống.',
    maxLevel: 1,
    maxHealth: 100,
    constructionCost: [{ itemId: 'item_wood', quantity: 6 }, { itemId: 'item_palm_leaf', quantity: 4 }],
    constructionDurationSeconds: 12,
    upgradeCosts: {},
    upgradeDurationSeconds: {},
    requiredLevel: 2,
    technologyId: 'tech_water_safety',
  },
  {
    id: 'building_water_filter',
    name: 'Bộ lọc nước thô',
    description: 'Lọc cặn bằng sỏi và than trước khi đun sôi nước.',
    maxLevel: 1,
    maxHealth: 120,
    constructionCost: [{ itemId: 'item_wood', quantity: 4 }, { itemId: 'item_gravel', quantity: 6 }, { itemId: 'item_charcoal', quantity: 2 }],
    constructionDurationSeconds: 18,
    upgradeCosts: {},
    upgradeDurationSeconds: {},
    requiredLevel: 3,
    technologyId: 'tech_water_safety',
  },
  {
    id: 'building_cooking_stove',
    name: 'Bếp nấu',
    description: 'Bếp đất tiết kiệm nhiên liệu, dùng nấu món ăn và đun nước.',
    maxLevel: 2,
    maxHealth: 140,
    constructionCost: [{ itemId: 'item_stone', quantity: 8 }, { itemId: 'item_wood', quantity: 4 }],
    constructionDurationSeconds: 18,
    upgradeCosts: { 2: [{ itemId: 'item_stone', quantity: 8 }, { itemId: 'item_wood_plank', quantity: 4 }] },
    upgradeDurationSeconds: { 2: 24 },
    requiredLevel: 2,
    technologyId: 'tech_island_settlement',
  },
  {
    id: 'building_smokehouse',
    name: 'Lò hun khói',
    description: 'Hun cá và thực phẩm bằng khói để kéo dài thời gian bảo quản.',
    maxLevel: 1,
    maxHealth: 140,
    constructionCost: [{ itemId: 'item_wood', quantity: 8 }, { itemId: 'item_stone', quantity: 4 }],
    constructionDurationSeconds: 20,
    upgradeCosts: {},
    upgradeDurationSeconds: {},
    requiredLevel: 3,
    technologyId: 'tech_food_preservation',
  },
  {
    id: 'building_salt_pan',
    name: 'Khay kết tinh muối',
    description: 'Phơi nước biển để thu muối dùng trong bảo quản thực phẩm.',
    maxLevel: 1,
    maxHealth: 90,
    constructionCost: [{ itemId: 'item_wood', quantity: 4 }, { itemId: 'item_seashell', quantity: 4 }],
    constructionDurationSeconds: 14,
    upgradeCosts: {},
    upgradeDurationSeconds: {},
    requiredLevel: 2,
    technologyId: 'tech_food_preservation',
  },
  {
    id: 'building_garden_bed',
    name: 'Luống trồng cây',
    description: 'Gieo hạt giống và thu hoạch cây trồng sau thời gian sinh trưởng.',
    maxLevel: 1,
    maxHealth: 90,
    constructionCost: [{ itemId: 'item_wood', quantity: 4 }, { itemId: 'item_rotten_wood', quantity: 3 }],
    constructionDurationSeconds: 12,
    upgradeCosts: {},
    upgradeDurationSeconds: {},
    requiredLevel: 2,
    technologyId: 'tech_agriculture',
  },
  {
    id: 'building_chicken_coop',
    name: 'Chuồng gà',
    description: 'Nuôi gà con và thu trứng định kỳ.',
    maxLevel: 1,
    maxHealth: 120,
    constructionCost: [{ itemId: 'item_wood', quantity: 8 }, { itemId: 'item_plant_fiber', quantity: 4 }],
    constructionDurationSeconds: 18,
    upgradeCosts: {},
    upgradeDurationSeconds: {},
    requiredLevel: 3,
    technologyId: 'tech_animal_husbandry',
  },
  {
    id: 'building_goat_pen',
    name: 'Chuồng dê',
    description: 'Nuôi tối đa hai dê con và thu sữa tươi theo chu kỳ.',
    maxLevel: 1,
    maxHealth: 140,
    constructionCost: [
      { itemId: 'item_wood', quantity: 8 },
      { itemId: 'item_wood_plank', quantity: 4 },
      { itemId: 'item_rope', quantity: 3 },
    ],
    constructionDurationSeconds: 20,
    upgradeCosts: {},
    upgradeDurationSeconds: {},
    requiredLevel: 4,
    technologyId: 'tech_animal_husbandry',
    requiredDiscoveryId: 'island_002',
  },
  {
    id: 'building_smelter',
    name: 'Lò luyện kim',
    description: 'Lò chịu nhiệt để xử lý quặng và mở khóa công cụ kim loại.',
    maxLevel: 2,
    maxHealth: 180,
    constructionCost: [
      { itemId: 'item_stone', quantity: 12 },
      { itemId: 'item_clay_brick', quantity: 6 },
      { itemId: 'item_charcoal', quantity: 4 },
    ],
    constructionDurationSeconds: 30,
    upgradeCosts: {
      2: [
        { itemId: 'item_stone', quantity: 12 },
        { itemId: 'item_clay_brick', quantity: 6 },
        { itemId: 'item_wood_plank', quantity: 6 },
      ],
    },
    upgradeDurationSeconds: { 2: 40 },
    requiredLevel: 5,
    technologyId: 'tech_advanced_production',
    requiredDiscoveryId: 'island_004',
  },
  {
    id: 'building_weaving_loom',
    name: 'Khung dệt',
    description: 'Dệt sợi thực vật thành vải và vật liệu cho trang bị.',
    maxLevel: 1,
    maxHealth: 120,
    constructionCost: [{ itemId: 'item_wood', quantity: 8 }, { itemId: 'item_rope', quantity: 3 }],
    constructionDurationSeconds: 20,
    upgradeCosts: {},
    upgradeDurationSeconds: {},
    requiredLevel: 3,
    technologyId: 'tech_island_settlement',
    requiredDiscoveryId: 'island_002',
  },
  {
    id: 'building_tannery',
    name: 'Bàn thuộc da',
    description: 'Xử lý da và vật liệu hữu cơ thành vật liệu bền.',
    maxLevel: 1,
    maxHealth: 120,
    constructionCost: [{ itemId: 'item_wood', quantity: 6 }, { itemId: 'item_bark', quantity: 4 }],
    constructionDurationSeconds: 18,
    upgradeCosts: {},
    upgradeDurationSeconds: {},
    requiredLevel: 3,
    technologyId: 'tech_island_settlement',
    requiredDiscoveryId: 'island_002',
  },
]

export function isBuildingDefinitionId(value: string): value is (typeof buildingDefinitions)[number]['id'] {
  return buildingDefinitions.some((definition) => definition.id === value)
}
