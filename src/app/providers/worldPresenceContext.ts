import { createContext } from 'react'
import type { WorldPlayerView } from '../../modules/social/services/worldPresenceClient'

export type WorldPresenceStatus = 'offline' | 'connecting' | 'online' | 'full' | 'unavailable'

export interface WorldPresenceContextValue {
  status: WorldPresenceStatus
  players: WorldPlayerView[]
  maxPlayers: number
  error: string | null
}

export const WorldPresenceContext = createContext<WorldPresenceContextValue | null>(null)
