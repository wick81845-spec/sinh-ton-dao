import cors from '@fastify/cors'
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify'
import type { AuthenticationServices } from './auth/authentication.js'
import { GameStateConflictError, type GameStateService } from './game/gameStateService.js'
import { isValidGameSnapshot } from '../src/services/persistence/gameSaveService.js'
import { WorldPresenceError, type WorldPresenceService } from './world/worldPresenceService.js'

export async function buildApiApp(
  authentication: AuthenticationServices,
  webOrigin: string,
  gameStates: GameStateService | null = null,
  worldPresence: WorldPresenceService | null = null,
): Promise<FastifyInstance> {
  const app = Fastify({ logger: true })
  app.decorateRequest('authenticatedUser', null)
  app.decorateRequest('accessToken', null)
  await app.register(cors, { origin: webOrigin })

  app.get('/health', async () => ({ status: 'ok' }))

  const runWorldOperation = async <T,>(reply: FastifyReply, operation: () => Promise<T>) => {
    try {
      return await operation()
    } catch (error: unknown) {
      if (error instanceof WorldPresenceError) {
        return reply.code(error.statusCode).send({ error: 'world_presence_rejected', message: error.message })
      }
      throw error
    }
  }

  const requireAuthentication = async (request: FastifyRequest, reply: FastifyReply) => {
    const token = readBearerToken(request.headers.authorization)
    if (!token) {
      return reply.code(401).send({ error: 'unauthorized', message: 'Cần đăng nhập để tiếp tục.' })
    }

    const user = await authentication.verifyAccessToken(token)
    if (!user) {
      return reply.code(401).send({ error: 'invalid_token', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' })
    }
    request.authenticatedUser = user
    request.accessToken = token
  }

  app.get('/api/v1/auth/me', { preHandler: requireAuthentication }, async (request, reply) => {
    const user = request.authenticatedUser
    const accessToken = request.accessToken
    if (!user || !accessToken) {
      return reply.code(401).send({ error: 'unauthorized', message: 'Cần đăng nhập để tiếp tục.' })
    }

    const profile = await authentication.getPlayerProfile(user.id, accessToken)
    if (!profile) {
      return reply.code(404).send({ error: 'profile_not_found', message: 'Chưa tìm thấy hồ sơ người chơi.' })
    }
    return { user, profile }
  })

  app.get('/api/v1/game/state', { preHandler: requireAuthentication }, async (request, reply) => {
    if (!gameStates) {
      return reply.code(503).send({
        error: 'game_state_not_configured',
        message: 'Game save cần SUPABASE_SECRET_KEY ở cấu hình API phía máy chủ.',
      })
    }

    const user = request.authenticatedUser
    const accessToken = request.accessToken
    if (!user || !accessToken) {
      return reply.code(401).send({ error: 'unauthorized', message: 'Cần đăng nhập để tiếp tục.' })
    }

    const profile = await authentication.getPlayerProfile(user.id, accessToken)
    if (!profile) {
      return reply.code(404).send({ error: 'profile_not_found', message: 'Chưa tìm thấy hồ sơ người chơi.' })
    }

    return gameStates.getOrCreate(user.id, profile.display_name, profile.island_name)
  })

  app.put('/api/v1/game/state', { preHandler: requireAuthentication }, async (request, reply) => {
    if (!gameStates) {
      return reply.code(503).send({
        error: 'game_state_not_configured',
        message: 'Game save cần SUPABASE_SECRET_KEY ở cấu hình API phía máy chủ.',
      })
    }

    const user = request.authenticatedUser
    const accessToken = request.accessToken
    if (!user || !accessToken) {
      return reply.code(401).send({ error: 'unauthorized', message: 'Cần đăng nhập để tiếp tục.' })
    }

    const body = request.body
    if (!isRecord(body)) {
      return reply.code(400).send({ error: 'invalid_game_state', message: 'Dữ liệu tiến trình không hợp lệ.' })
    }
    const expectedRevision = body.expectedRevision
    if (typeof expectedRevision !== 'number'
      || !Number.isSafeInteger(expectedRevision)
      || expectedRevision < 0
      || !isValidGameSnapshot(body.state)) {
      return reply.code(400).send({ error: 'invalid_game_state', message: 'Dữ liệu tiến trình không hợp lệ.' })
    }

    const profile = await authentication.getPlayerProfile(user.id, accessToken)
    if (!profile) {
      return reply.code(404).send({ error: 'profile_not_found', message: 'Chưa tìm thấy hồ sơ người chơi.' })
    }

    try {
      return await gameStates.save(
        user.id,
        profile.display_name,
        profile.island_name,
        body.state,
        expectedRevision,
      )
    } catch (error: unknown) {
      if (error instanceof GameStateConflictError) {
        return reply.code(409).send({ error: 'game_state_conflict', message: error.message })
      }
      throw error
    }
  })

  app.post('/api/v1/world/enter', { preHandler: requireAuthentication }, async (request, reply) => {
    if (!worldPresence) return reply.code(503).send({ error: 'world_presence_not_configured', message: 'Hiện diện thế giới cần SUPABASE_SECRET_KEY ở cấu hình API.' })
    const user = request.authenticatedUser
    if (!user) return reply.code(401).send({ error: 'unauthorized', message: 'Cần đăng nhập để tiếp tục.' })
    return runWorldOperation(reply, async () => {
      await worldPresence.enter(user.id)
      return { players: await worldPresence.getOnlinePlayers(), maxPlayers: 20 }
    })
  })

  app.post('/api/v1/world/heartbeat', { preHandler: requireAuthentication }, async (request, reply) => {
    if (!worldPresence) return reply.code(503).send({ error: 'world_presence_not_configured', message: 'Hiện diện thế giới cần SUPABASE_SECRET_KEY ở cấu hình API.' })
    const user = request.authenticatedUser
    if (!user) return reply.code(401).send({ error: 'unauthorized', message: 'Cần đăng nhập để tiếp tục.' })
    return runWorldOperation(reply, async () => {
      await worldPresence.enter(user.id)
      return { ok: true, maxPlayers: 20 }
    })
  })

  app.get('/api/v1/world/players', { preHandler: requireAuthentication }, async (_request, reply) => {
    if (!worldPresence) return reply.code(503).send({ error: 'world_presence_not_configured', message: 'Hiện diện thế giới cần SUPABASE_SECRET_KEY ở cấu hình API.' })
    return runWorldOperation(reply, async () => ({ players: await worldPresence.getOnlinePlayers(), maxPlayers: 20 }))
  })

  app.delete('/api/v1/world/leave', { preHandler: requireAuthentication }, async (request, reply) => {
    if (!worldPresence) return reply.code(503).send({ error: 'world_presence_not_configured', message: 'Hiện diện thế giới cần SUPABASE_SECRET_KEY ở cấu hình API.' })
    const user = request.authenticatedUser
    if (!user) return reply.code(401).send({ error: 'unauthorized', message: 'Cần đăng nhập để tiếp tục.' })
    return runWorldOperation(reply, async () => {
      await worldPresence.leave(user.id)
      return { ok: true }
    })
  })

  return app
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null
  const match = /^Bearer ([^\s]+)$/i.exec(authorization)
  return match?.[1] ?? null
}
