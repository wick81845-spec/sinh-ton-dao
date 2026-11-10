import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApiApp } from './app.js'
import type { AuthenticationServices } from './auth/authentication.js'
import { GameStateConflictError, type GameStateService } from './game/gameStateService.js'
import { WorldPresenceError, type WorldPresenceService, type WorldPlayer } from './world/worldPresenceService.js'
import type { AdminControlService } from './admin/adminControlService.js'
import { initialGameState } from '../src/data/mockGameState.js'

const profile = {
  id: 'auth-user-1',
  username: 'islander',
  display_name: 'Người chơi',
  island_name: 'Đảo mới',
  is_admin: false,
  created_at: '2026-11-08T00:00:00.000Z',
  updated_at: '2026-11-08T00:00:00.000Z',
}
const onlinePlayer: WorldPlayer = {
  id: profile.id,
  displayName: profile.display_name,
  islandName: profile.island_name,
  joinedAt: '2026-11-09T00:00:00.000Z',
}

describe('backend API foundation', () => {
  const apps: Awaited<ReturnType<typeof buildApiApp>>[] = []

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()))
  })

  it('exposes an unauthenticated health check', async () => {
    const app = await buildApiApp({ verifyAccessToken: vi.fn(), getPlayerProfile: vi.fn() }, 'http://localhost:5173')
    apps.push(app)

    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('allows browser preflight for authenticated game saves and world leave', async () => {
    const app = await buildApiApp({ verifyAccessToken: vi.fn(), getPlayerProfile: vi.fn() }, 'https://sinh-ton-dao.vercel.app')
    apps.push(app)

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/game/state',
      headers: {
        origin: 'https://sinh-ton-dao.vercel.app',
        'access-control-request-method': 'PUT',
        'access-control-request-headers': 'authorization,content-type',
      },
    })

    expect(response.statusCode).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe('https://sinh-ton-dao.vercel.app')
    expect(response.headers['access-control-allow-methods']).toContain('PUT')
    expect(response.headers['access-control-allow-headers']).toContain('content-type')
  })

  it('rejects missing and invalid bearer tokens before profile access', async () => {
    const getPlayerProfile = vi.fn()
    const authentication: AuthenticationServices = {
      verifyAccessToken: vi.fn().mockResolvedValue(null),
      getPlayerProfile,
    }
    const app = await buildApiApp(authentication, 'http://localhost:5173')
    apps.push(app)

    const missing = await app.inject({ method: 'GET', url: '/api/v1/auth/me' })
    const invalid = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: 'Bearer test-access-token' },
    })

    expect(missing.statusCode).toBe(401)
    expect(invalid.statusCode).toBe(401)
    expect(getPlayerProfile).not.toHaveBeenCalled()
  })

  it('only reads a game save selected by the verified auth identity', async () => {
    const gameStates: GameStateService = {
      getOrCreate: vi.fn().mockResolvedValue({ state: initialGameState, revision: 3, created: false }),
      save: vi.fn().mockResolvedValue({ state: initialGameState, revision: 4, created: false }),
    }
    const app = await buildApiApp({
      verifyAccessToken: vi.fn().mockResolvedValue({ id: profile.id, email: 'player@example.test' }),
      getPlayerProfile: vi.fn().mockResolvedValue(profile),
    }, 'http://localhost:5173', gameStates)
    apps.push(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/game/state?playerId=another-player',
      headers: { authorization: 'Bearer test-access-token' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ revision: 3, state: initialGameState, created: false })
    expect(gameStates.getOrCreate).toHaveBeenCalledWith(profile.id, profile.display_name, profile.island_name)
  })

  it('saves a valid game state only for the verified player profile', async () => {
    const gameStates: GameStateService = {
      getOrCreate: vi.fn(),
      save: vi.fn().mockResolvedValue({ state: initialGameState, revision: 4, created: false }),
    }
    const app = await buildApiApp({
      verifyAccessToken: vi.fn().mockResolvedValue({ id: profile.id, email: null }),
      getPlayerProfile: vi.fn().mockResolvedValue(profile),
    }, 'http://localhost:5173', gameStates)
    apps.push(app)

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/game/state',
      headers: { authorization: 'Bearer test-token' },
      payload: { expectedRevision: 3, state: initialGameState, playerId: 'another-player' },
    })

    expect(response.statusCode).toBe(200)
    expect(gameStates.save).toHaveBeenCalledWith(
      profile.id, profile.display_name, profile.island_name, initialGameState, 3,
    )
  })

  it('rejects invalid game state revisions and reports concurrent save conflicts', async () => {
    const gameStates: GameStateService = {
      getOrCreate: vi.fn(),
      save: vi.fn().mockRejectedValue(new GameStateConflictError()),
    }
    const app = await buildApiApp({
      verifyAccessToken: vi.fn().mockResolvedValue({ id: profile.id, email: null }),
      getPlayerProfile: vi.fn().mockResolvedValue(profile),
    }, 'http://localhost:5173', gameStates)
    apps.push(app)

    const invalid = await app.inject({
      method: 'PUT',
      url: '/api/v1/game/state',
      headers: { authorization: 'Bearer test-token' },
      payload: { expectedRevision: -1, state: initialGameState },
    })
    expect(invalid.statusCode).toBe(400)
    expect(gameStates.save).not.toHaveBeenCalled()

    const conflict = await app.inject({
      method: 'PUT',
      url: '/api/v1/game/state',
      headers: { authorization: 'Bearer test-token' },
      payload: { expectedRevision: 3, state: initialGameState },
    })

    expect(conflict.statusCode).toBe(409)
    expect(conflict.json()).toMatchObject({ error: 'game_state_conflict' })
  })

  it('enters, heartbeats, lists and leaves the shared world by verified identity', async () => {
    const worldPresence: WorldPresenceService = {
      enter: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
      getOnlinePlayers: vi.fn().mockResolvedValue([onlinePlayer]),
    }
    const app = await buildApiApp({
      verifyAccessToken: vi.fn().mockResolvedValue({ id: profile.id, email: null }),
      getPlayerProfile: vi.fn().mockResolvedValue(profile),
    }, 'http://localhost:5173', null, worldPresence)
    apps.push(app)
    const headers = { authorization: 'Bearer test-access-token' }

    const entered = await app.inject({ method: 'POST', url: '/api/v1/world/enter', headers })
    const heartbeat = await app.inject({ method: 'POST', url: '/api/v1/world/heartbeat', headers })
    const roster = await app.inject({ method: 'GET', url: '/api/v1/world/players', headers })
    const left = await app.inject({ method: 'DELETE', url: '/api/v1/world/leave', headers })
    const unauthenticated = await app.inject({ method: 'DELETE', url: '/api/v1/world/leave' })

    expect(entered.statusCode).toBe(200)
    expect(entered.json()).toEqual({ players: [onlinePlayer], maxPlayers: 20 })
    expect(heartbeat.statusCode).toBe(200)
    expect(roster.json()).toEqual({ players: [onlinePlayer], maxPlayers: 20 })
    expect(left.json()).toEqual({ ok: true })
    expect(unauthenticated.statusCode).toBe(401)
    expect(worldPresence.enter).toHaveBeenCalledTimes(2)
    expect(worldPresence.enter).toHaveBeenCalledWith(profile.id)
    expect(worldPresence.leave).toHaveBeenCalledOnce()
  })

  it('returns the full-world conflict as an actionable client error', async () => {
    const worldPresence: WorldPresenceService = {
      enter: vi.fn().mockRejectedValue(new WorldPresenceError('Thế giới đã đủ 20 người chơi online.', 409)),
      leave: vi.fn(),
      getOnlinePlayers: vi.fn(),
    }
    const app = await buildApiApp({
      verifyAccessToken: vi.fn().mockResolvedValue({ id: profile.id, email: null }),
      getPlayerProfile: vi.fn().mockResolvedValue(profile),
    }, 'http://localhost:5173', null, worldPresence)
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/world/enter',
      headers: { authorization: 'Bearer test-access-token' },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({
      error: 'world_presence_rejected',
      message: 'Thế giới đã đủ 20 người chơi online.',
    })
    expect(worldPresence.getOnlinePlayers).not.toHaveBeenCalled()
  })

  it('requires a server-verified admin profile for global weather and player adjustments', async () => {
    const adminControls: AdminControlService = {
      listPlayers: vi.fn().mockResolvedValue([]),
      getPlayerSurvival: vi.fn().mockResolvedValue(null),
      playerExists: vi.fn().mockResolvedValue(true),
      getGlobalSettings: vi.fn().mockResolvedValue({ weatherId: null, updatedAt: null }),
      setGlobalWeather: vi.fn(),
      createSurvivalCommand: vi.fn(),
      getPendingCommands: vi.fn(),
      acknowledgeCommand: vi.fn(),
    }
    const app = await buildApiApp({
      verifyAccessToken: vi.fn().mockResolvedValue({ id: profile.id, email: null }),
      getPlayerProfile: vi.fn().mockResolvedValue(profile),
    }, 'http://localhost:5173', null, null, adminControls)
    apps.push(app)

    const weather = await app.inject({
      method: 'PUT',
      url: '/api/v1/game/admin/world-weather',
      headers: { authorization: 'Bearer valid-admin-token-1234567890' },
      payload: { weatherId: 'thunderstorm' },
    })
    const survival = await app.inject({
      method: 'POST',
      url: '/api/v1/game/admin/players/9fb61632-9e1f-4380-9a64-05553612b353/survival',
      headers: { authorization: 'Bearer valid-admin-token-1234567890' },
      payload: { health: 65, wetness: 80, ailments: [{ id: 'hypothermia', elapsedMs: 0, severity: 'moderate' }] },
    })
    const playerStats = await app.inject({
      method: 'GET',
      url: '/api/v1/game/admin/players/9fb61632-9e1f-4380-9a64-05553612b353/survival',
      headers: { authorization: '******' },
    })

    const authenticatedPlayerStats = await app.inject({
      method: 'GET',
      url: '/api/v1/game/admin/players/9fb61632-9e1f-4380-9a64-05553612b353/survival',
      headers: { authorization: 'Bearer valid-admin-token-1234567890' },
    })
    expect(weather.statusCode).toBe(403)
    expect(survival.statusCode).toBe(403)
    expect(playerStats.statusCode).toBe(401)
    expect(authenticatedPlayerStats.statusCode).toBe(403)
    expect(adminControls.setGlobalWeather).not.toHaveBeenCalled()
    expect(adminControls.createSurvivalCommand).not.toHaveBeenCalled()
  })

  it('allows admins to set shared weather and queue validated survival changes', async () => {
    const adminProfile = { ...profile, is_admin: true }
    const adminControls: AdminControlService = {
      listPlayers: vi.fn().mockResolvedValue([]),
      getPlayerSurvival: vi.fn().mockResolvedValue({
        survival: initialGameState.survival,
        ailments: [],
        status: 'alive',
        currentLocationId: 'island_001',
      }),
      playerExists: vi.fn().mockResolvedValue(true),
      getGlobalSettings: vi.fn().mockResolvedValue({ weatherId: null, updatedAt: null }),
      setGlobalWeather: vi.fn().mockResolvedValue({ weatherId: 'thunderstorm', updatedAt: '2026-11-11T12:00:00.000Z' }),
      createSurvivalCommand: vi.fn().mockResolvedValue('command-1'),
      getPendingCommands: vi.fn(),
      acknowledgeCommand: vi.fn(),
    }
    const app = await buildApiApp({
      verifyAccessToken: vi.fn().mockResolvedValue({ id: profile.id, email: null }),
      getPlayerProfile: vi.fn().mockResolvedValue(adminProfile),
    }, 'http://localhost:5173', null, null, adminControls)
    apps.push(app)

    const weather = await app.inject({
      method: 'PUT',
      url: '/api/v1/game/admin/world-weather',
      headers: { authorization: 'Bearer valid-admin-token-1234567890' },
      payload: { weatherId: 'thunderstorm' },
    })
    const survival = await app.inject({
      method: 'POST',
      url: '/api/v1/game/admin/players/9fb61632-9e1f-4380-9a64-05553612b353/survival',
      headers: { authorization: 'Bearer valid-admin-token-1234567890' },
      payload: { health: 65, wetness: 80, ailments: [{ id: 'hypothermia', elapsedMs: 0, severity: 'moderate' }] },
    })
    const playerStats = await app.inject({
      method: 'GET',
      url: '/api/v1/game/admin/players/9fb61632-9e1f-4380-9a64-05553612b353/survival',
      headers: { authorization: '******' },
    })
    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/game/admin/players/9fb61632-9e1f-4380-9a64-05553612b353/survival',
      headers: { authorization: 'Bearer valid-admin-token-1234567890' },
      payload: { health: 101 },
    })
    const authenticatedPlayerStats = await app.inject({
      method: 'GET',
      url: '/api/v1/game/admin/players/9fb61632-9e1f-4380-9a64-05553612b353/survival',
      headers: { authorization: 'Bearer valid-admin-token-1234567890' },
    })
    const revive = await app.inject({
      method: 'POST',
      url: '/api/v1/game/admin/players/9fb61632-9e1f-4380-9a64-05553612b353/survival',
      headers: { authorization: 'Bearer valid-admin-token-1234567890' },
      payload: { revive: true },
    })

    expect(weather.statusCode).toBe(200)
    expect(weather.json()).toMatchObject({ weatherId: 'thunderstorm' })
    expect(adminControls.setGlobalWeather).toHaveBeenCalledWith('thunderstorm', profile.id)
    expect(survival.statusCode).toBe(202)
    expect(playerStats.statusCode).toBe(401)
    expect(authenticatedPlayerStats.statusCode).toBe(200)
    expect(authenticatedPlayerStats.json()).toMatchObject({
      survival: initialGameState.survival,
      ailments: [],
      status: 'alive',
      currentLocationId: 'island_001',
    })
    expect(revive.statusCode).toBe(202)
    expect(adminControls.createSurvivalCommand).toHaveBeenLastCalledWith(
      '9fb61632-9e1f-4380-9a64-05553612b353',
      profile.id,
      { revive: true },
    )
    expect(adminControls.createSurvivalCommand).toHaveBeenCalledWith(
      '9fb61632-9e1f-4380-9a64-05553612b353',
      profile.id,
      { health: 65, wetness: 80, ailments: [{ id: 'hypothermia', elapsedMs: 0, severity: 'moderate' }] },
    )
    expect(invalid.statusCode).toBe(400)
    expect(adminControls.createSurvivalCommand).toHaveBeenCalledTimes(2)
  })
})
