import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './useAuth'
import { WorldPresenceContext, type WorldPresenceStatus } from './worldPresenceContext'
import {
  enterGlobalWorld,
  fetchOnlineWorldPlayers,
  heartbeatGlobalWorld,
  type WorldPlayerView,
} from '../../modules/social/services/worldPresenceClient'

export function WorldPresenceProvider({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth()
  const [presence, setPresence] = useState<{
    token: string | null
    status: WorldPresenceStatus
    players: WorldPlayerView[]
    maxPlayers: number
    error: string | null
  }>({ token: null, status: 'offline', players: [], maxPlayers: 20, error: null })
  const token = session?.access_token

  useEffect(() => {
    if (isLoading || !token) return

    let active = true
    let hasEntered = false
    let interval: ReturnType<typeof setInterval> | undefined

    const setFailure = (presenceError: unknown) => {
      if (!active) return
      const message = presenceError instanceof Error ? presenceError.message : 'Không thể cập nhật trạng thái thế giới.'
      hasEntered = false
      setPresence({
        token,
        status: message.includes('đủ 20 người') ? 'full' : 'unavailable',
        players: [],
        maxPlayers: 20,
        error: message,
      })
      if (message.includes('đủ 20 người')) {
        void fetchOnlineWorldPlayers(token).then((result) => {
          if (!active) return
          setPresence({ token, status: 'full', players: result.players, maxPlayers: result.maxPlayers, error: message })
        }).catch((rosterError: unknown) => {
          console.error('Không thể tải danh sách người chơi đang online.', rosterError)
        })
      }
    }

    const refreshPresence = async () => {
      try {
        const result = hasEntered
          ? await heartbeatGlobalWorld(token).then(() => fetchOnlineWorldPlayers(token))
          : await enterGlobalWorld(token)
        if (!active) return
        hasEntered = true
        setPresence({ token, status: 'online', players: result.players, maxPlayers: result.maxPlayers, error: null })
      } catch (presenceError: unknown) {
        setFailure(presenceError)
      }
    }

    refreshPresence()
    interval = setInterval(refreshPresence, 15_000)

    return () => {
      active = false
      if (interval) clearInterval(interval)
    }
  }, [isLoading, token])

  const value = useMemo(() => {
    if (isLoading) return { status: 'connecting' as const, players: [], maxPlayers: 20, error: null }
    if (!token) return { status: 'offline' as const, players: [], maxPlayers: 20, error: null }
    if (presence.token !== token) return { status: 'connecting' as const, players: [], maxPlayers: 20, error: null }
    return {
      status: presence.status,
      players: presence.players,
      maxPlayers: presence.maxPlayers,
      error: presence.error,
    }
  }, [isLoading, token, presence])
  return <WorldPresenceContext.Provider value={value}>{children}</WorldPresenceContext.Provider>
}
