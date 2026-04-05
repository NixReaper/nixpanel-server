import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAuth } from '../../middleware/auth.js'
import { exec, writeFile } from '../../core/exec.js'

export default async function ftpRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth]

  fastify.get('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : parseInt((request.query as Record<string, string>).accountId ?? '0', 10)

    const accounts = await prisma.ftpAccount.findMany({
      where: { accountId },
      select: { id: true, username: true, homedir: true, quotaMb: true, status: true, createdAt: true },
      orderBy: { username: 'asc' },
    })
    return reply.send({ success: true, data: accounts })
  })

  fastify.post('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : (request.body as Record<string, number>).accountId

    const body = z.object({
      username: z.string().min(1).max(32).regex(/^[a-zA-Z0-9_]+$/),
      password: z.string().min(8),
      homedir: z.string().default('/'),
      quotaMb: z.number().int().min(0).default(0),
    }).safeParse(request.body)

    if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })

    const account = await prisma.account.findUnique({ where: { id: accountId }, include: { package: true } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    // Check quota
    if (account.package && account.package.maxFtpAccounts > 0) {
      const count = await prisma.ftpAccount.count({ where: { accountId } })
      if (count >= account.package.maxFtpAccounts) {
        return reply.code(429).send({ success: false, error: 'FTP account limit reached' })
      }
    }

    const ftpUsername = `${account.username}_${body.data.username}`
    const homedir = `${account.homedir}${body.data.homedir}`

    // Create system user for FTP (locked shell, home in account dir)
    await exec('useradd', ['-m', '-d', homedir, '-s', '/sbin/nologin', ftpUsername])
    await exec('mkdir', ['-p', homedir])
    await exec('chown', [`${ftpUsername}:${ftpUsername}`, homedir])

    const passwordHash = await bcrypt.hash(body.data.password, 12)

    // Add to vsftpd virtual users list
    const vsftpdUser = `/etc/vsftpd/users/${ftpUsername}`
    await writeFile(vsftpdUser, `${ftpUsername}\n${body.data.password}\n`)

    const ftpAccount = await prisma.ftpAccount.create({
      data: { username: ftpUsername, passwordHash, homedir, quotaMb: body.data.quotaMb, accountId },
    })

    const { passwordHash: _, ...safe } = ftpAccount
    return reply.code(201).send({ success: true, data: safe })
  })

  fastify.put('/:id/password', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const body = z.object({ password: z.string().min(8) }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ success: false, error: 'Password must be at least 8 characters' })

    const ftpAccount = await prisma.ftpAccount.findFirst({
      where: { id: parseInt(id, 10), ...(user.role === 'user' ? { accountId: user.sub } : {}) },
    })
    if (!ftpAccount) return reply.code(404).send({ success: false, error: 'FTP account not found' })

    const passwordHash = await bcrypt.hash(body.data.password, 12)
    await prisma.ftpAccount.update({ where: { id: ftpAccount.id }, data: { passwordHash } })

    return reply.send({ success: true, data: { message: 'FTP password updated' } })
  })

  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const ftpAccount = await prisma.ftpAccount.findFirst({
      where: { id: parseInt(id, 10), ...(user.role === 'user' ? { accountId: user.sub } : {}) },
    })
    if (!ftpAccount) return reply.code(404).send({ success: false, error: 'FTP account not found' })

    await exec('userdel', [ftpAccount.username])
    await prisma.ftpAccount.delete({ where: { id: ftpAccount.id } })

    return reply.send({ success: true, data: { message: 'FTP account deleted' } })
  })
}
