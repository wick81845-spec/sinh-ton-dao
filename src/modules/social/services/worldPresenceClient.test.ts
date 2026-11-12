import { describe, expect, it } from 'vitest'
import { getOnlinePlayersOnIsland, type WorldPlayerView } from './worldPresenceClient'

const players: WorldPlayerView[] = [
  {
    id: 'player-1',
    displayName: 'An',
    islandName: 'Đảo nhà An',
    currentIslandId: 'island_002',
    joinedAt: '2026-11-12T10:00:00.000Z',
  },
  {
    id: 'player-2',
    displayName: 'Bình',
    islandName: 'Đảo nhà Bình',
    currentIslandId: 'island_003',
    joinedAt: '2026-11-12T10:01:00.000Z',
  },
  {
    id: 'player-3',
    displayName: 'Chi',
    islandName: 'Đảo nhà Chi',
    currentIslandId: null,
    joinedAt: '2026-11-12T10:02:00.000Z',
  },
]

describe('getOnlinePlayersOnIsland', () => {
  it('returns only online players whose saved current location matches the island', () => {
    expect(getOnlinePlayersOnIsland(players, 'island_002').map((player) => player.displayName)).toEqual(['An'])
    expect(getOnlinePlayersOnIsland(players, 'island_004')).toEqual([])
  })

  it('does not show the global roster on a personal island', () => {
    const playersOnStartingIsland = [
      ...players,
      { ...players[0], id: 'player-4', currentIslandId: 'island_001' },
    ]

    expect(getOnlinePlayersOnIsland(playersOnStartingIsland, 'island_001', true)).toEqual([])
  })
})
