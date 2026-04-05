import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Role, JwtPayload } from '../types/index.js'

/**
 * Verify a valid JWT is present. Attaches payload to request.user.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify<JwtPayload>()
  } catch {
    reply.code(401).send({ success: false, error: 'Unauthorized' })
  }
}

/**
 * Require one of the specified roles.
 */
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      await request.jwtVerify<JwtPayload>()
    } catch {
      reply.code(401).send({ success: false, error: 'Unauthorized' })
      return
    }

    if (!request.user || !roles.includes(request.user.role)) {
      reply.code(403).send({ success: false, error: 'Forbidden' })
    }
  }
}

/**
 * Admin-only gate.
 */
export const requireAdmin = requireRole('admin')

/**
 * Admin or reseller gate.
 */
export const requireAdminOrReseller = requireRole('admin', 'reseller')
