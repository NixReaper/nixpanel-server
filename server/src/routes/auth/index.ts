import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { config } from '../../config.js'
import type { JwtPayload, Role } from '../../types/index.js'
import { requireAuth } from '../../middleware/auth.js'

const LoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1),
})

/**
 * Generate access + refresh token pair.
 */
function signTokens(
  fastify: FastifyInstance,
  sub: number,
  role: Role,
  username: string
) {
  const payload: JwtPayload = { sub, role, username }

  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: config.jwt.expiresIn,
  })

  const refreshToken = fastify.jwt.sign(
    { ...payload, type: 'refresh' },
    { secret: config.jwt.refreshSecret, expiresIn: config.jwt.refreshExpiresIn }
  )

  return { accessToken, refreshToken }
}

export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/auth/login
   * Login for admin, reseller, or cPanel user.
   * Body: { username, password }
   * Returns: { accessToken, refreshToken, role, user }
   */
  fastify.post('/login', async (request, reply) => {
    const body = LoginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: 'Invalid request body' })
    }

    const { username, password } = body.data

    // Try admin first
    const admin = await prisma.adminUser.findUnique({ where: { username } })
    if (admin) {
      const valid = await bcrypt.compare(password, admin.passwordHash)
      if (!valid) {
        return reply.code(401).send({ success: false, error: 'Invalid credentials' })
      }

      const { accessToken, refreshToken } = signTokens(fastify, admin.id, 'admin', admin.username)

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)
      await prisma.refreshToken.create({
        data: { token: refreshToken, role: 'admin', adminId: admin.id, expiresAt },
      })

      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { lastLogin: new Date(), lastLoginIp: request.ip },
      })

      return reply.send({
        success: true,
        data: {
          accessToken,
          refreshToken,
          role: 'admin',
          user: { id: admin.id, username: admin.username, email: admin.email },
        },
      })
    }

    // Try reseller
    const reseller = await prisma.reseller.findUnique({ where: { username } })
    if (reseller) {
      if (reseller.status !== 'active') {
        return reply.code(403).send({ success: false, error: 'Account suspended' })
      }
      const valid = await bcrypt.compare(password, reseller.passwordHash)
      if (!valid) {
        return reply.code(401).send({ success: false, error: 'Invalid credentials' })
      }

      const { accessToken, refreshToken } = signTokens(fastify, reseller.id, 'reseller', reseller.username)

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)
      await prisma.refreshToken.create({
        data: { token: refreshToken, role: 'reseller', resellerId: reseller.id, expiresAt },
      })

      return reply.send({
        success: true,
        data: {
          accessToken,
          refreshToken,
          role: 'reseller',
          user: { id: reseller.id, username: reseller.username, email: reseller.email },
        },
      })
    }

    // Try hosting account (cPanel user)
    const account = await prisma.account.findUnique({ where: { username } })
    if (account) {
      if (account.status !== 'active') {
        return reply.code(403).send({ success: false, error: 'Account suspended' })
      }
      const valid = await bcrypt.compare(password, account.passwordHash)
      if (!valid) {
        return reply.code(401).send({ success: false, error: 'Invalid credentials' })
      }

      const { accessToken, refreshToken } = signTokens(fastify, account.id, 'user', account.username)

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)
      await prisma.refreshToken.create({
        data: { token: refreshToken, role: 'user', accountId: account.id, expiresAt },
      })

      return reply.send({
        success: true,
        data: {
          accessToken,
          refreshToken,
          role: 'user',
          user: { id: account.id, username: account.username, email: account.email, domain: account.domain },
        },
      })
    }

    return reply.code(401).send({ success: false, error: 'Invalid credentials' })
  })

  /**
   * POST /api/auth/refresh
   * Exchange a refresh token for a new access token.
   */
  fastify.post('/refresh', async (request, reply) => {
    const body = z.object({ refreshToken: z.string() }).safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: 'refreshToken required' })
    }

    let payload: JwtPayload & { type?: string }
    try {
      payload = fastify.jwt.verify<JwtPayload & { type?: string }>(
        body.data.refreshToken,
        { secret: config.jwt.refreshSecret }
      )
    } catch {
      return reply.code(401).send({ success: false, error: 'Invalid or expired refresh token' })
    }

    if (payload.type !== 'refresh') {
      return reply.code(401).send({ success: false, error: 'Not a refresh token' })
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: body.data.refreshToken } })
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return reply.code(401).send({ success: false, error: 'Refresh token revoked or expired' })
    }

    // Rotate: revoke old, issue new
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    const newPayload: JwtPayload = { sub: payload.sub, role: payload.role as Role, username: payload.username }
    const accessToken = fastify.jwt.sign(newPayload, { expiresIn: config.jwt.expiresIn })
    const newRefresh = fastify.jwt.sign(
      { ...newPayload, type: 'refresh' },
      { secret: config.jwt.refreshSecret, expiresIn: config.jwt.refreshExpiresIn }
    )

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const createData: Parameters<typeof prisma.refreshToken.create>[0]['data'] = {
      token: newRefresh,
      role: payload.role,
      expiresAt,
    }
    if (stored.adminId) createData.adminId = stored.adminId
    if (stored.resellerId) createData.resellerId = stored.resellerId
    if (stored.accountId) createData.accountId = stored.accountId

    await prisma.refreshToken.create({ data: createData })

    return reply.send({ success: true, data: { accessToken, refreshToken: newRefresh } })
  })

  /**
   * POST /api/auth/logout
   * Revoke the refresh token.
   */
  fastify.post('/logout', { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({ refreshToken: z.string() }).safeParse(request.body)
    if (body.success) {
      await prisma.refreshToken.updateMany({
        where: { token: body.data.refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }
    return reply.send({ success: true, data: null })
  })

  /**
   * GET /api/auth/me
   * Return the current authenticated user's profile.
   */
  fastify.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user!

    if (user.role === 'admin') {
      const admin = await prisma.adminUser.findUnique({
        where: { id: user.sub },
        select: { id: true, username: true, email: true, lastLogin: true, twoFactorEnabled: true },
      })
      return reply.send({ success: true, data: { ...admin, role: 'admin' } })
    }

    if (user.role === 'reseller') {
      const reseller = await prisma.reseller.findUnique({
        where: { id: user.sub },
        select: { id: true, username: true, email: true, company: true, status: true },
      })
      return reply.send({ success: true, data: { ...reseller, role: 'reseller' } })
    }

    const account = await prisma.account.findUnique({
      where: { id: user.sub },
      select: { id: true, username: true, email: true, domain: true, status: true },
    })
    return reply.send({ success: true, data: { ...account, role: 'user' } })
  })
}
