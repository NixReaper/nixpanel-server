import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAdmin } from '../../middleware/auth.js'
import { exec } from '../../core/exec.js'

export default async function securityRoutes(fastify: FastifyInstance) {
  // GET /api/whm/security/events
  fastify.get('/events', { preHandler: [requireAdmin] }, async (request, reply) => {
    const q = request.query as Record<string, string>
    const page = Math.max(1, parseInt(q.page ?? '1', 10))
    const limit = Math.min(100, parseInt(q.limit ?? '50', 10))
    const where: Record<string, unknown> = {}
    if (q.severity) where.severity = q.severity
    if (q.resolved !== undefined) where.resolved = q.resolved === 'true'

    const [items, total] = await Promise.all([
      prisma.securityEvent.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.securityEvent.count({ where }),
    ])

    return reply.send({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } })
  })

  // POST /api/whm/security/events/:id/resolve
  fastify.post('/events/:id/resolve', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.securityEvent.update({
      where: { id: parseInt(id, 10) },
      data: { resolved: true, resolvedAt: new Date() },
    })
    return reply.send({ success: true, data: { message: 'Event resolved' } })
  })

  // GET /api/whm/security/blocked-ips
  fastify.get('/blocked-ips', { preHandler: [requireAdmin] }, async (request, reply) => {
    const blocked = await prisma.blockedIp.findMany({ orderBy: { createdAt: 'desc' } })
    return reply.send({ success: true, data: blocked })
  })

  // POST /api/whm/security/blocked-ips
  fastify.post('/blocked-ips', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = z.object({
      ip: z.string().ip(),
      reason: z.string().max(500).optional(),
      expiresAt: z.string().datetime().optional(),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const exists = await prisma.blockedIp.findUnique({ where: { ip: body.data.ip } })
    if (exists) return reply.code(409).send({ success: false, error: 'IP already blocked' })

    await exec('ufw', ['insert', '1', 'deny', 'from', body.data.ip, 'to', 'any'])

    const blocked = await prisma.blockedIp.create({
      data: {
        ip: body.data.ip,
        reason: body.data.reason,
        expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null,
      },
    })

    return reply.code(201).send({ success: true, data: blocked })
  })

  // DELETE /api/whm/security/blocked-ips/:id
  fastify.delete('/blocked-ips/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const blocked = await prisma.blockedIp.findUnique({ where: { id: parseInt(id, 10) } })
    if (!blocked) return reply.code(404).send({ success: false, error: 'IP not found' })

    await exec('ufw', ['delete', 'deny', 'from', blocked.ip, 'to', 'any'])
    await prisma.blockedIp.delete({ where: { id: blocked.id } })

    return reply.send({ success: true, data: { message: `${blocked.ip} unblocked` } })
  })

  // GET /api/whm/security/whitelisted-ips
  fastify.get('/whitelisted-ips', { preHandler: [requireAdmin] }, async (request, reply) => {
    const list = await prisma.whitelistedIp.findMany({ orderBy: { createdAt: 'desc' } })
    return reply.send({ success: true, data: list })
  })

  // POST /api/whm/security/whitelisted-ips
  fastify.post('/whitelisted-ips', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = z.object({
      ip: z.string().ip(),
      note: z.string().max(255).optional(),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const entry = await prisma.whitelistedIp.create({ data: body.data })
    return reply.code(201).send({ success: true, data: entry })
  })

  // DELETE /api/whm/security/whitelisted-ips/:id
  fastify.delete('/whitelisted-ips/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.whitelistedIp.delete({ where: { id: parseInt(id, 10) } })
    return reply.send({ success: true, data: { message: 'Removed from whitelist' } })
  })

  // GET /api/whm/security/fail2ban
  fastify.get('/fail2ban', { preHandler: [requireAdmin] }, async (request, reply) => {
    const result = await exec('fail2ban-client', ['status'])
    return reply.send({ success: true, data: { output: result.stdout } })
  })

  // GET /api/whm/security/fail2ban/:jail
  fastify.get('/fail2ban/:jail', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { jail } = request.params as { jail: string }
    const result = await exec('fail2ban-client', ['status', jail])
    return reply.send({ success: true, data: { output: result.stdout } })
  })
}
