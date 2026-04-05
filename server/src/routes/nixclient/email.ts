import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAuth } from '../../middleware/auth.js'
import { exec } from '../../core/exec.js'

export default async function cpanelEmailRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth]

  // GET /api/nixclient/email
  fastify.get('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : parseInt((request.query as Record<string, string>).accountId ?? '0', 10)

    const accounts = await prisma.emailAccount.findMany({
      where: { accountId },
      orderBy: { address: 'asc' },
      select: { id: true, address: true, username: true, domain: true, quotaMb: true, usedMb: true, status: true },
    })
    return reply.send({ success: true, data: accounts })
  })

  // POST /api/nixclient/email
  fastify.post('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : (request.body as Record<string, unknown>).accountId as number

    const body = z.object({
      username: z.string().min(1).max(64).regex(/^[a-zA-Z0-9._+-]+$/),
      password: z.string().min(8),
      quotaMb: z.number().int().min(0).default(500),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const account = await prisma.account.findUnique({ where: { id: accountId }, include: { package: true } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    if (account.package && account.package.maxEmailAccounts > 0) {
      const count = await prisma.emailAccount.count({ where: { accountId: account.id } })
      if (count >= account.package.maxEmailAccounts) {
        return reply.code(429).send({ success: false, error: 'Email account limit reached' })
      }
    }

    const address = `${body.data.username}@${account.domain}`
    const exists = await prisma.emailAccount.findUnique({ where: { address } })
    if (exists) return reply.code(409).send({ success: false, error: 'Email address already exists' })

    const passwordHash = await bcrypt.hash(body.data.password, 12)

    await exec('doveadm', ['user', 'import', '-u', address, '-p', body.data.password])

    const emailAccount = await prisma.emailAccount.create({
      data: { username: body.data.username, domain: account.domain, address, passwordHash, quotaMb: body.data.quotaMb, accountId: account.id },
    })

    const { passwordHash: _, ...safe } = emailAccount
    return reply.code(201).send({ success: true, data: safe })
  })

  // DELETE /api/nixclient/email/:id
  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : 0
    const { id } = request.params as { id: string }

    const emailAccount = await prisma.emailAccount.findUnique({ where: { id: parseInt(id, 10) } })
    if (!emailAccount) return reply.code(404).send({ success: false, error: 'Email account not found' })
    if (user.role === 'user' && emailAccount.accountId !== accountId) {
      return reply.code(403).send({ success: false, error: 'Forbidden' })
    }

    await exec('doveadm', ['user', 'delete', '-u', emailAccount.address])
    await prisma.emailAccount.delete({ where: { id: emailAccount.id } })

    return reply.send({ success: true, data: { message: 'Email account deleted' } })
  })

  // GET /api/nixclient/email/forwarders
  fastify.get('/forwarders', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : parseInt((request.query as Record<string, string>).accountId ?? '0', 10)

    const forwarders = await prisma.emailForwarder.findMany({ where: { accountId } })
    return reply.send({ success: true, data: forwarders })
  })

  // POST /api/nixclient/email/forwarders
  fastify.post('/forwarders', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : (request.body as Record<string, unknown>).accountId as number

    const body = z.object({
      source: z.string().email(),
      destination: z.string().email(),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const forwarder = await prisma.emailForwarder.create({ data: { ...body.data, accountId } })
    return reply.code(201).send({ success: true, data: forwarder })
  })

  // DELETE /api/nixclient/email/forwarders/:id
  fastify.delete('/forwarders/:id', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : 0
    const { id } = request.params as { id: string }

    const forwarder = await prisma.emailForwarder.findUnique({ where: { id: parseInt(id, 10) } })
    if (!forwarder) return reply.code(404).send({ success: false, error: 'Forwarder not found' })
    if (user.role === 'user' && forwarder.accountId !== accountId) {
      return reply.code(403).send({ success: false, error: 'Forbidden' })
    }

    await prisma.emailForwarder.delete({ where: { id: forwarder.id } })
    return reply.send({ success: true, data: { message: 'Forwarder deleted' } })
  })
}
