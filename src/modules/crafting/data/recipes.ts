import type { ItemQuantity } from '../../../shared/types/game'

export type RecipeIngredient = ItemQuantity

export interface RecipeDefinition {
  id: string
  kind: 'crafting' | 'processing'
  name: string
  description: string
  ingredients: RecipeIngredient[]
  output: RecipeIngredient
  durationSeconds: number
  stationId?: string
  requiredLevel?: number
  technologyId?: string
  requiredDiscoveryId?: string
  requiresLitCampfire?: boolean
}

export const craftingQueueLimit = 3

export const recipes: readonly RecipeDefinition[] = [
  {
    id: 'recipe_wooden_axe',
    kind: 'crafting',
    name: 'Rìu gỗ',
    description: 'Một chiếc rìu đơn giản, dùng để khai thác gỗ ở rìa rừng.',
    ingredients: [
      { itemId: 'item_wood', quantity: 3 },
      { itemId: 'item_stone', quantity: 2 },
    ],
    output: { itemId: 'item_wooden_axe', quantity: 1 },
    durationSeconds: 6,
    requiredLevel: 1,
  },
  {
    id: 'recipe_wood_plank',
    kind: 'processing',
    name: 'Xẻ ván gỗ',
    description: 'Xẻ gỗ mềm thành những tấm ván phẳng để dùng trong công trình và sản xuất.',
    ingredients: [{ itemId: 'item_wood_soft', quantity: 3 }],
    output: { itemId: 'item_wood_plank', quantity: 2 },
    durationSeconds: 8,
    stationId: 'building_workbench',
    requiredLevel: 1,
    technologyId: 'tech_basic_tools',
  },
  {
    id: 'recipe_charcoal',
    kind: 'processing',
    name: 'Nung than củi',
    description: 'Nung gỗ mềm trong lò để tạo nhiên liệu cháy lâu hơn.',
    ingredients: [{ itemId: 'item_wood_soft', quantity: 3 }],
    output: { itemId: 'item_charcoal', quantity: 2 },
    durationSeconds: 12,
    stationId: 'building_kiln',
    requiredLevel: 2,
    technologyId: 'tech_advanced_production',
  },
  {
    id: 'recipe_dried_fruit',
    kind: 'processing',
    name: 'Phơi trái cây',
    description: 'Phơi trái cây dưới nắng để bảo quản cho những chuyến đi xa.',
    ingredients: [{ itemId: 'item_wild_fruit', quantity: 3 }],
    output: { itemId: 'item_dried_fruit', quantity: 2 },
    durationSeconds: 10,
    requiredLevel: 1,
    requiredDiscoveryId: 'island_002',
  },
  {
    id: 'recipe_backpack',
    kind: 'crafting',
    name: 'Ba lô dã chiến',
    description: 'Đan lá cọ và sợi thực vật thành ba lô, tăng sức chứa hành trang lên 24 ô.',
    ingredients: [
      { itemId: 'item_palm_leaf', quantity: 6 },
      { itemId: 'item_plant_fiber', quantity: 8 },
      { itemId: 'item_wood', quantity: 4 },
    ],
    output: { itemId: 'item_backpack', quantity: 1 },
    durationSeconds: 24,
    stationId: 'building_workbench',
    requiredLevel: 2,
  },
  {
    id: 'recipe_rope',
    kind: 'crafting',
    name: 'Bện dây thực vật',
    description: 'Bện sợi thực vật thành dây chắc để dùng trong các món đồ sinh tồn.',
    ingredients: [{ itemId: 'item_plant_fiber', quantity: 3 }],
    output: { itemId: 'item_rope', quantity: 1 },
    durationSeconds: 8,
    requiredLevel: 1,
  },
  {
    id: 'recipe_fishing_rod',
    kind: 'crafting',
    name: 'Cần câu thô',
    description: 'Ghép cành cây và dây bện thành cần câu có thể dùng nhiều lần.',
    ingredients: [
      { itemId: 'item_branch', quantity: 3 },
      { itemId: 'item_rope', quantity: 1 },
    ],
    output: { itemId: 'item_fishing_rod', quantity: 1 },
    durationSeconds: 12,
    stationId: 'building_workbench',
    requiredLevel: 1,
  },
  {
    id: 'recipe_wooden_spear',
    kind: 'crafting',
    name: 'Lao gỗ',
    description: 'Mài nhọn cành cây và buộc mũi đá để tạo vũ khí bền hơn.',
    ingredients: [
      { itemId: 'item_branch', quantity: 2 },
      { itemId: 'item_stone', quantity: 2 },
      { itemId: 'item_rope', quantity: 1 },
    ],
    output: { itemId: 'item_wooden_spear', quantity: 1 },
    durationSeconds: 16,
    stationId: 'building_workbench',
    requiredLevel: 2,
  },
  {
    id: 'recipe_roast_fish',
    kind: 'processing',
    name: 'Nướng cá',
    description: 'Nướng cá tươi trên lửa trại đang cháy; món ăn no lâu nhưng vẫn cần dùng sớm.',
    ingredients: [{ itemId: 'item_fresh_fish', quantity: 1 }],
    output: { itemId: 'item_cooked_fish', quantity: 1 },
    durationSeconds: 10,
    stationId: 'building_campfire',
    requiresLitCampfire: true,
    requiredLevel: 1,
  },
  {
    id: 'recipe_roast_crab',
    kind: 'processing',
    name: 'Nướng cua',
    description: 'Nướng cua nhỏ trên lửa để xử lý chín trước khi ăn.',
    ingredients: [{ itemId: 'item_crab', quantity: 1 }],
    output: { itemId: 'item_roasted_crab', quantity: 1 },
    durationSeconds: 8,
    stationId: 'building_campfire',
    requiresLitCampfire: true,
    requiredLevel: 1,
  },
  {
    id: 'recipe_roast_shrimp',
    kind: 'processing',
    name: 'Nướng tôm',
    description: 'Nướng tôm nhỏ trên lửa trại để làm bữa ăn nhanh.',
    ingredients: [{ itemId: 'item_shrimp', quantity: 2 }],
    output: { itemId: 'item_roasted_shrimp', quantity: 2 },
    durationSeconds: 8,
    stationId: 'building_campfire',
    requiresLitCampfire: true,
    requiredLevel: 1,
  },
  {
    id: 'recipe_mushroom_soup',
    kind: 'processing',
    name: 'Nấu canh nấm',
    description: 'Nấu nấm rừng với nước sạch để có món ăn bù cả năng lượng và nước.',
    ingredients: [
      { itemId: 'item_wild_mushroom', quantity: 2 },
      { itemId: 'item_fresh_water', quantity: 1 },
    ],
    output: { itemId: 'item_mushroom_soup', quantity: 1 },
    durationSeconds: 12,
    stationId: 'building_campfire',
    requiresLitCampfire: true,
    requiredLevel: 1,
  },
]
