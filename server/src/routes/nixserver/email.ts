import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAdminOrReseller } from '../../middleware/auth.js'
import { exec } from '../../core/exec.js'

export default async function emailRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAdminOrReseller]

  // GET /api/nixserver/email?accountId=
  fastify.get('/', { preHandler }, async (request, reply) => {
    const q = request.query as Record<string, string>
    const where: Record<string, unknown> = {}
    if (q.accountId) where.accountId = parseInt(q.accountId, 10)
    if (q.domain) where.domain = q.domain

    const accounts = await prisma.emailAccount.findMany({
      where,
      orderBy: { address: 'asc' },
      select: {
        id: true, address: true, username: true, domain: true,
        quotaMb: true, usedMb: true, status: true, createdAt: true,
        account: { select: { username: true } },
      },
    })
    return reply.send({ success: true, data: accounts })
  })

  // POST /api/nixserver/email
  fastify.post('/', { preHandler }, async (request, reply) => {
    const body = z.object({
      accountId: z.number().int().positive(),
      username: z.string().min(1).max(64).regex(/^[a-zA-Z0-9._+-]+$/),
      password: z.string().min(8),
      quotaMb: z.number().int().min(0).default(500),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const account = await prisma.account.findUnique({
      where: { id: body.data.accountId },
      include: { package: true },
    })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    // Check quota
    if (account.package && account.package.maxEmailAccounts > 0) {
      const count = await prisma.emailAccount.count({ where: { accountId: account.id } })
      if (count >= account.package.maxEmailAccounts) {
        return reply.code(429).send({ success: false, error: 'Email account limit reached for this package' })
      }
    }

    const address = `${body.data.username}@${account.domain}`
    const exists = await prisma.emailAccount.findUnique({ where: { address } })
    if (exists) return reply.code(409).send({ success: false, error: 'Email address already exists' })

    const passwordHash = await bcrypt.hash(body.data.password, 12)

    // Create Postfix/Dovecot mailbox via doveadm
    const result = await exec('doveadm', [
      'user', 'import', '-u', address, '-p', body.data.password,
    ])
    // Non-fatal in dev

    const emailAccount = await prisma.emailAccount.create({
      data: {
        username: body.data.username,
        domain: account.domain,
        address,
        passwordHash,
        quotaMb: body.data.quotaMb,
        accountId: account.id,
      },
    })

    const { passwordHash: _, ...safe } = emailAccount
    return reply.code(201).send({ success: true, data: safe })
  })

  // DELETE /api/nixserver/email/:id
  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const emailAccount = await prisma.emailAccount.findUnique({ where: { id: parseInt(id, 10) } })
    if (!emailAccount) return reply.code(404).send({ success: false, error: 'Email account not found' })

    await exec('doveadm', ['user', 'delete', '-u', emailAccount.address])
    await prisma.emailAccount.delete({ where: { id: emailAccount.id } })

    return reply.send({ success: true, data: { message: 'Email account deleted' } })
  })

  // POST /api/nixserver/email/:id/password
  fastify.post('/:id/password', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ password: z.string().min(8) }).safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: 'Password must be at least 8 characters' })
    }

    const emailAccount = await prisma.emailAccount.findUnique({ where: { id: parseInt(id, 10) } })
    if (!emailAccount) return reply.code(404).send({ success: false, error: 'Email account not found' })

    const passwordHash = await bcrypt.hash(body.data.password, 12)
    await prisma.emailAccount.update({ where: { id: emailAccount.id }, data: { passwordHash } })

    return reply.send({ success: true, data: { message: 'Password updated' } })
  })

  // GET /api/nixserver/email/forwarders?accountId=
  fastify.get('/forwarders', { preHandler }, async (request, reply) => {
    const q = request.query as Record<string, string>
    const where: Record<string, unknown> = {}
    if (q.accountId) where.accountId = parseInt(q.accountId, 10)

    const forwarders = await prisma.emailForwarder.findMany({ where })
    return reply.send({ success: true, data: forwarders })
  })

  // POST /api/nixserver/email/forwarders
  fastify.post('/forwarders', { preHandler }, async (request, reply) => {
    const body = z.object({
      accountId: z.number().int().positive(),
      source: z.string().email(),
      destination: z.string().email(),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const forwarder = await prisma.emailForwarder.create({ data: body.data })
    return reply.code(201).send({ success: true, data: forwarder })
  })

  // DELETE /api/nixserver/email/forwarders/:id
  fastify.delete('/forwarders/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.emailForwarder.delete({ where: { id: parseInt(id, 10) } })
    return reply.send({ success: true, data: { message: 'Forwarder deleted' } })
  })
}
