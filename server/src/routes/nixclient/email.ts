import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAuth } from '../../middleware/auth.js'
import { createMailbox, removeMailbox, addForwarder, removeForwarder, updateMailboxPassword } from '../../core/mail.js'

export default async function emailRoutes(fastify: FastifyInstance) {
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
      username: z.string().min(1).max(64).regex(/^[a-zA-Z0-9._+-]+$/, 'Invalid email username'),
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

    await createMailbox(account.username, address, body.data.password)

    const passwordHash = await bcrypt.hash(body.data.password, 12)
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

  // PUT /api/nixclient/email/:id/password
  fastify.put('/:id/password', { preHandler }, async (request, reply) => {
    const user = request.user!
    const { id } = request.params as { id: string }

    const body = z.object({ password: z.string().min(8) }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })

    const emailAccount = await prisma.emailAccount.findFirst({
      where: { id: parseInt(id, 10), ...(user.role === 'user' ? { accountId: user.sub } : {}) },
    })
    if (!emailAccount) return reply.code(404).send({ success: false, error: 'Email account not found' })

    await updateMailboxPassword(emailAccount.address, body.data.password)

    const passwordHash = await bcrypt.hash(body.data.password, 12)
    await prisma.emailAccount.update({
      where: { id: emailAccount.id },
      data: { passwordHash },
    })

    return reply.send({ success: true, data: { message: 'Password updated' } })
  })

  // DELETE /api/nixclient/email/:id
  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const user = request.user!
    const { id } = request.params as { id: string }

    const emailAccount = await prisma.emailAccount.findFirst({
      where: { id: parseInt(id, 10), ...(user.role === 'user' ? { accountId: user.sub } : {}) },
      include: { account: true },
    })
    if (!emailAccount) return reply.code(404).send({ success: false, error: 'Email account not found' })

    // Check if domain has other mailboxes before potentially removing the domain entry
    const remaining = await prisma.emailAccount.count({
      where: { accountId: emailAccount.accountId, domain: emailAccount.domain, id: { not: emailAccount.id } },
    })

    await removeMailbox(emailAccount.account.username, emailAccount.address, true)

    if (remaining === 0) {
      const { removeVirtualDomain } = await import('../../core/mail.js')
      await removeVirtualDomain(emailAccount.domain)
    }

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

    const existing = await prisma.emailForwarder.findFirst({
      where: { source: body.data.source, accountId },
    })
    if (existing) return reply.code(409).send({ success: false, error: 'Forwarder already exists' })

    await addForwarder(body.data.source, body.data.destination)

    const forwarder = await prisma.emailForwarder.create({ data: { ...body.data, accountId } })
    return reply.code(201).send({ success: true, data: forwarder })
  })

  // DELETE /api/nixclient/email/forwarders/:id
  fastify.delete('/forwarders/:id', { preHandler }, async (request, reply) => {
    const user = request.user!
    const { id } = request.params as { id: string }

    const forwarder = await prisma.emailForwarder.findFirst({
      where: { id: parseInt(id, 10), ...(user.role === 'user' ? { accountId: user.sub } : {}) },
    })
    if (!forwarder) return reply.code(404).send({ success: false, error: 'Forwarder not found' })

    await removeForwarder(forwarder.source)
    await prisma.emailForwarder.delete({ where: { id: forwarder.id } })
    return reply.send({ success: true, data: { message: 'Forwarder deleted' } })
  })
}
