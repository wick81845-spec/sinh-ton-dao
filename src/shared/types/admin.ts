import type { SurvivalAilment } from './game'

export interface AdminPlayerSummary {
  id: string
  username: string
  displayName: string
}

export interface GlobalGameSettings {
  weatherId: string | null
  updatedAt: string | null
}

export interface AdminSurvivalCommand {
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
