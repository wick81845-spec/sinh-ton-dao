import { useContext } from 'react'
import { WorldPresenceContext } from './worldPresenceContext'

export function useWorldPresence() {
  const context = useContext(WorldPresenceContext)
  if (!context) throw new Error('useWorldPresence phải được sử dụng bên trong WorldPresenceProvider.')
  return context
}
