import type { SurvivalAilment, SurvivalStats } from './game'

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
}

export interface GlobalGameSettings {
  weatherId: string | null
  updatedAt: string | null
}

export interface AdminSurvivalCommand {
  revive?: true
  health?: number
  hunger?: number
  thirst?: number
  stamina?: number
  bodyTemperature?: number
  wetness?: number
  ailments?: SurvivalAilment[]
}

export interface PendingAdminCommand {
  id: string
  command: AdminSurvivalCommand
}
