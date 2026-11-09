import type { ItemQuantity } from '../../../shared/types/game'

export interface ShipDefinition {
  id: string
  name: string
  description: string
  maxHealth: number
  constructionCost: ItemQuantity[]
  constructionDurationSeconds: number
}

export const shipDefinitions: readonly ShipDefinition[] = [
  {
    id: 'ship_raft',
    name: 'Bè gỗ',
    description: 'Phương tiện đơn giản để đi lại giữa những hòn đảo đã phát hiện.',
    maxHealth: 100,
    constructionCost: [{ itemId: 'item_wood', quantity: 10 }, { itemId: 'item_stone', quantity: 4 }],
    constructionDurationSeconds: 10,
  },
]

export function getShipDefinition(definitionId: string): ShipDefinition | undefined {
  return shipDefinitions.find((ship) => ship.id === definitionId)
}
