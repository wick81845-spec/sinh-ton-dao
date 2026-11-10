import type { ItemQuantity } from '../../../shared/types/game'

export interface ShipDefinition {
  id: string
  name: string
  description: string
  maxHealth: number
  travelTimeMultiplier: number
  constructionCost: ItemQuantity[]
  constructionDurationSeconds: number
  upgradeFromDefinitionId?: string
  requiredLevel?: number
  technologyId?: string
  requiredDiscoveryId?: string
}

export const shipDefinitions: readonly ShipDefinition[] = [
  {
    id: 'ship_raft',
    name: 'Bè gỗ',
    description: 'Phương tiện đơn giản để đi lại giữa những hòn đảo đã phát hiện.',
    maxHealth: 100,
    travelTimeMultiplier: 1,
    constructionCost: [{ itemId: 'item_wood', quantity: 10 }, { itemId: 'item_stone', quantity: 4 }],
    constructionDurationSeconds: 10,
  },
  {
    id: 'ship_sailboat',
    name: 'Thuyền buồm',
    description: 'Nâng cấp bè thành thuyền có buồm để rút ngắn các chuyến đi xa.',
    maxHealth: 180,
    travelTimeMultiplier: 0.65,
    constructionCost: [
      { itemId: 'item_wood_plank', quantity: 8 },
      { itemId: 'item_wood_hard', quantity: 6 },
      { itemId: 'item_rope', quantity: 8 },
      { itemId: 'item_ship_parts', quantity: 3 },
    ],
    constructionDurationSeconds: 45,
    upgradeFromDefinitionId: 'ship_raft',
    requiredLevel: 8,
    technologyId: 'tech_ocean_frontier',
    requiredDiscoveryId: 'island_008',
  },
]

export function getShipDefinition(definitionId: string): ShipDefinition | undefined {
  return shipDefinitions.find((ship) => ship.id === definitionId)
}
