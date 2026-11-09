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
    technologyId: 'tech_seafaring',
  },
]
