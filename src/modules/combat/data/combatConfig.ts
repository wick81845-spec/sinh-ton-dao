import type { ItemQuantity } from '../../../shared/types/game'

export interface CombatEncounterDefinition {
  id: string
  name: string
  description: string
  locationId: string
  type: 'pirate' | 'raid' | 'duel'
  opponentHealth: number
  attackDamage: number
  loot: ItemQuantity[]
  targetPlayerId?: string
}

export const combatRules = {
  baseDamage: 12,
  woodenAxeBonus: 14,
  respawnHealth: 60,
  respawnStamina: 70,
} as const

export const combatEncounters: readonly CombatEncounterDefinition[] = [
  {
    id: 'encounter_pirate_patrol',
    name: 'Cướp biển tuần tra',
    description: 'Một tên cướp biển lảng vảng gần bờ và để mắt đến căn cứ.',
    locationId: 'island_001',
    type: 'pirate',
    opponentHealth: 28,
    attackDamage: 11,
    loot: [{ itemId: 'item_wood', quantity: 3 }, { itemId: 'item_wild_fruit', quantity: 1 }],
  },
  {
    id: 'encounter_raid_sora',
    name: 'Đột kích mô phỏng · Sora',
    description: 'Thử sức phòng thủ căn cứ trong một trận đột kích giả lập với Sora.',
    locationId: 'island_001',
    type: 'raid',
    opponentHealth: 38,
    attackDamage: 17,
    loot: [{ itemId: 'item_stone', quantity: 3 }, { itemId: 'item_wild_fruit', quantity: 2 }],
    targetPlayerId: 'player_sora',
  },
  {
    id: 'encounter_duel_sora',
    name: 'Đấu tập · Sora',
    description: 'Trận đấu giao hữu giả lập; không ảnh hưởng đến tài sản của người chơi khác.',
    locationId: 'island_002',
    type: 'duel',
    opponentHealth: 32,
    attackDamage: 10,
    loot: [{ itemId: 'item_wild_fruit', quantity: 1 }],
    targetPlayerId: 'player_sora',
  },
]
