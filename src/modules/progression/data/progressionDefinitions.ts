import type { ItemQuantity, SkillId } from '../../../shared/types/game'

export interface SkillDefinition {
  id: SkillId
  name: string
  description: string
  icon: string
}

export interface TechnologyDefinition {
  id: string
  name: string
  description: string
  requiredLevel: number
  skillId: SkillId
  prerequisites: string[]
  researchCost: ItemQuantity[]
  requiredDiscoveryId?: string
}

export const skillDefinitions: readonly SkillDefinition[] = [
  { id: 'gathering', name: 'Thu thập', description: 'Rèn luyện câu cá giúp tăng cơ hội gặp loài hiếm và kéo cá dễ hơn.', icon: '⌁' },
  { id: 'processing', name: 'Sơ chế', description: 'Mở khóa các quy trình chế biến nguyên liệu.', icon: '⚒' },
  { id: 'building', name: 'Xây dựng', description: 'Phát triển công trình và căn cứ.', icon: '⌂' },
  { id: 'exploration', name: 'Khám phá', description: 'Mở rộng hiểu biết về các đảo.', icon: '⌖' },
  { id: 'combat', name: 'Chiến đấu', description: 'Rèn luyện qua các trận chạm trán.', icon: '⚔' },
]

export const technologyDefinitions: readonly TechnologyDefinition[] = [
  { id: 'tech_basic_tools', name: 'Dụng cụ sinh tồn', description: 'Công cụ thô sơ và quy trình xẻ gỗ cơ bản.', requiredLevel: 1, skillId: 'processing', prerequisites: [], researchCost: [{ itemId: 'item_wood', quantity: 3 }, { itemId: 'item_stone', quantity: 2 }] },
  { id: 'tech_island_settlement', name: 'Định cư trên đảo', description: 'Bàn chế tạo, kho chứa và lều trú ẩn.', requiredLevel: 2, skillId: 'building', prerequisites: ['tech_basic_tools'], researchCost: [{ itemId: 'item_wood', quantity: 5 }, { itemId: 'item_stone', quantity: 3 }] },
  { id: 'tech_seafaring', name: 'Hàng hải ven bờ', description: 'Đóng bè và khảo sát các đảo lân cận.', requiredLevel: 3, skillId: 'exploration', prerequisites: ['tech_island_settlement'], researchCost: [{ itemId: 'item_wood_plank', quantity: 4 }, { itemId: 'item_wood', quantity: 4 }] },
  { id: 'tech_advanced_production', name: 'Sản xuất nâng cao', description: 'Mở đường cho các trạm nung và dây chuyền chế biến.', requiredLevel: 5, skillId: 'processing', prerequisites: ['tech_island_settlement'], researchCost: [{ itemId: 'item_wood', quantity: 4 }, { itemId: 'item_wood_plank', quantity: 3 }] },
  { id: 'tech_water_safety', name: 'Nước uống an toàn', description: 'Thu gom, lọc và đun sôi nước đúng cách.', requiredLevel: 2, skillId: 'processing', prerequisites: ['tech_island_settlement'], researchCost: [{ itemId: 'item_wood', quantity: 3 }, { itemId: 'item_gravel', quantity: 3 }] },
  { id: 'tech_food_preservation', name: 'Bảo quản thực phẩm', description: 'Phơi, hun khói và ướp muối để dự trữ thức ăn.', requiredLevel: 3, skillId: 'processing', prerequisites: ['tech_island_settlement'], researchCost: [{ itemId: 'item_wood', quantity: 4 }, { itemId: 'item_seaweed', quantity: 3 }] },
  { id: 'tech_agriculture', name: 'Trồng trọt trên đảo', description: 'Gieo trồng hạt giống phù hợp với đất và nguồn nước.', requiredLevel: 2, skillId: 'building', prerequisites: ['tech_island_settlement'], researchCost: [{ itemId: 'item_wood', quantity: 3 }, { itemId: 'item_wild_fruit', quantity: 3 }] },
  { id: 'tech_animal_husbandry', name: 'Chăn nuôi cơ bản', description: 'Dựng chuồng và chăm sóc vật nuôi nhỏ.', requiredLevel: 3, skillId: 'building', prerequisites: ['tech_agriculture'], researchCost: [{ itemId: 'item_wood', quantity: 4 }, { itemId: 'item_wild_fruit', quantity: 2 }] },
  { id: 'tech_metalworking', name: 'Luyện kim sơ cấp', description: 'Tìm quặng ở đảo đá và luyện kim loại bằng than.', requiredLevel: 5, skillId: 'processing', prerequisites: ['tech_advanced_production'], researchCost: [{ itemId: 'item_rough_stone', quantity: 6 }, { itemId: 'item_charcoal', quantity: 3 }], requiredDiscoveryId: 'island_004' },
  { id: 'tech_seafaring_advanced', name: 'Đóng thuyền ven bờ', description: 'Gia cố thân thuyền, buồm và khoang hàng.', requiredLevel: 5, skillId: 'exploration', prerequisites: ['tech_seafaring'], researchCost: [{ itemId: 'item_wood_plank', quantity: 6 }, { itemId: 'item_rope', quantity: 3 }], requiredDiscoveryId: 'island_003' },
  { id: 'tech_ocean_frontier', name: 'Biên giới đại dương', description: 'Chuẩn bị cho hành trình tới vùng biển xa.', requiredLevel: 8, skillId: 'exploration', prerequisites: ['tech_seafaring', 'tech_seafaring_advanced', 'tech_advanced_production'], researchCost: [{ itemId: 'item_charcoal', quantity: 4 }, { itemId: 'item_wood_plank', quantity: 6 }] },
]

export const characterLevelTitles = [
  'Tân thủ',
  'Người sinh tồn',
  'Thợ thủ công',
  'Người dựng trại',
  'Người khai phá',
  'Thợ lành nghề',
  'Người định cư',
  'Bậc thầy chế tác',
  'Nhà kiến tạo',
  'Người khai đảo',
] as const

export function characterLevelTitle(level: number): string {
  const normalizedLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1
  const index = Math.min(normalizedLevel - 1, characterLevelTitles.length - 1)
  return characterLevelTitles[index]
}

export function experienceRequiredForLevel(level: number): number {
  return Math.max(100, level * 100)
}

export function levelForExperience(experience: number): number {
  let level = 1
  let remaining = experience
  while (remaining >= experienceRequiredForLevel(level)) {
    remaining -= experienceRequiredForLevel(level)
    level += 1
  }
  return level
}

export function currentLevelProgress(experience: number): { current: number; required: number } {
  let level = 1
  let remaining = experience
  while (remaining >= experienceRequiredForLevel(level)) {
    remaining -= experienceRequiredForLevel(level)
    level += 1
  }
  return { current: remaining, required: experienceRequiredForLevel(level) }
}

export function skillLevelForExperience(experience: number): number {
  let level = 1
  let remaining = experience
  while (remaining >= level * 50) {
    remaining -= level * 50
    level += 1
  }
  return level
}
