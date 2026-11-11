import type { InventorySlot, ItemId, SurvivalAilment, SurvivalStats } from './game'

export interface AdminPlayerSummary {
  id: string
  username: string
  displayName: string
}

export interface AdminPlayerSurvivalSummary {
  survival: SurvivalStats
  ailments: SurvivalAilment[]
  status: 'alive' | 'dead'
  currentLocationId: string
  inventory: InventorySlot[]
  storage: InventorySlot[]
}

export interface GlobalGameSettings {
  weatherId: string | null
  updatedAt: string | null
}

export interface AdminSurvivalCommand {
  revive?: true
  restoreAll?: true
  teleportToIslandId?: string
  itemTransfers?: AdminItemTransfer[]
  health?: number
  hunger?: number
  thirst?: number
  stamina?: number
  bodyTemperature?: number
  wetness?: number
  ailments?: SurvivalAilment[]
}

export interface AdminItemTransfer {
  action: 'give' | 'take'
  container: 'inventory' | 'storage'
  itemId: ItemId
  quantity: number
}

export interface PendingAdminCommand {
  id: string
  command: AdminSurvivalCommand
}
