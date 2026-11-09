import type { AuthenticatedUser } from '../auth/authentication.js'

declare module 'fastify' {
  interface FastifyRequest {
    authenticatedUser: AuthenticatedUser | null
    accessToken: string | null
  }
}
