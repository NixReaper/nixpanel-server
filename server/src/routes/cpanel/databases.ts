import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAuth } from '../../middleware/auth.js'
import { exec } from '../../core/exec.js'

function mysqlEscape(s: string): string {
  return s.replace(/'/g, "\\'").replace(/\\/g, '\\\\')
}

export default async function databaseRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth]

  // GET /api/cpanel/databases
  fastify.get('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : parseInt((request.query as Record<string, string>).accountId ?? '0', 10)

    const databases = await prisma.database.findMany({
      where: { accountId },
      include: { dbUsers: { select: { id: true, username: true, host: true, privileges: true } } },
      orderBy: { name: 'asc' },
    })
    return reply.send({ success: true, data: databases })
  })

  // POST /api/cpanel/databases
  fastify.post('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : parseInt((request.body as Record<string, string>).accountId ?? '0', 10)

    const body = z.object({
      name: z.string().min(1).max(32).regex(/^[a-zA-Z0-9_]+$/),
      charset: z.string().default('utf8mb4'),
      collation: z.string().default('utf8mb4_unicode_ci'),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { package: true },
    })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    // Check quota
    if (account.package && account.package.maxDatabases > 0) {
      const count = await prisma.database.count({ where: { accountId } })
      if (count >= account.package.maxDatabases) {
        return reply.code(429).send({ success: false, error: 'Database limit reached' })
      }
    }

    // Prefix database name with username to avoid conflicts
    const dbName = `${account.username}_${body.data.name}`
    const exists = await prisma.database.findUnique({ where: { name: dbName } })
    if (exists) return reply.code(409).send({ success: false, error: 'Database already exists' })

    // Create the actual MariaDB database
    const result = await exec('mysql', [
      '-e',
      `CREATE DATABASE \`${mysqlEscape(dbName)}\` CHARACTER SET ${mysqlEscape(body.data.charset)} COLLATE ${mysqlEscape(body.data.collation)};`,
    ])
    if (result.exitCode !== 0 && !process.env.NODE_ENV?.startsWith('dev')) {
      return reply.code(500).send({ success: false, error: `Failed to create database: ${result.stderr}` })
    }

    const db = await prisma.database.create({
      data: { name: dbName, charset: body.data.charset, collation: body.data.collation, accountId },
    })
    return reply.code(201).send({ success: true, data: db })
  })

  // DELETE /api/cpanel/databases/:id
  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const db = await prisma.database.findFirst({
      where: {
        id: parseInt(id, 10),
        ...(user.role === 'user' ? { accountId: user.sub } : {}),
      },
    })
    if (!db) return reply.code(404).send({ success: false, error: 'Database not found' })

    await exec('mysql', ['-e', `DROP DATABASE IF EXISTS \`${mysqlEscape(db.name)}\`;`])
    await prisma.database.delete({ where: { id: db.id } })

    return reply.send({ success: true, data: { message: `Database ${db.name} deleted` } })
  })

  // POST /api/cpanel/databases/:id/users
  fastify.post('/:id/users', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const body = z.object({
      username: z.string().min(1).max(16).regex(/^[a-zA-Z0-9_]+$/),
      password: z.string().min(8),
      privileges: z.string().default('ALL'),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const db = await prisma.database.findFirst({
      where: {
        id: parseInt(id, 10),
        ...(user.role === 'user' ? { accountId: user.sub } : {}),
      },
      include: { account: true },
    })
    if (!db) return reply.code(404).send({ success: false, error: 'Database not found' })

    const dbUsername = `${db.account.username}_${body.data.username}`
    const escapedPass = mysqlEscape(body.data.password)

    // Create MariaDB user and grant privileges
    await exec('mysql', ['-e', `CREATE USER '${mysqlEscape(dbUsername)}'@'localhost' IDENTIFIED BY '${escapedPass}';`])
    await exec('mysql', ['-e', `GRANT ${mysqlEscape(body.data.privileges)} ON \`${mysqlEscape(db.name)}\`.* TO '${mysqlEscape(dbUsername)}'@'localhost';`])
    await exec('mysql', ['-e', 'FLUSH PRIVILEGES;'])

    const passwordHash = await bcrypt.hash(body.data.password, 12)
    const dbUser = await prisma.databaseUser.create({
      data: {
        username: dbUsername,
        passwordHash,
        privileges: body.data.privileges,
        databaseId: db.id,
      },
    })

    const { passwordHash: _, ...safe } = dbUser
    return reply.code(201).send({ success: true, data: safe })
  })

  // DELETE /api/cpanel/databases/:id/users/:userId
  fastify.delete('/:id/users/:userId', { preHandler }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string }

    const dbUser = await prisma.databaseUser.findFirst({
      where: { id: parseInt(userId, 10), databaseId: parseInt(id, 10) },
    })
    if (!dbUser) return reply.code(404).send({ success: false, error: 'Database user not found' })

    await exec('mysql', ['-e', `DROP USER IF EXISTS '${mysqlEscape(dbUser.username)}'@'localhost';`])
    await exec('mysql', ['-e', 'FLUSH PRIVILEGES;'])
    await prisma.databaseUser.delete({ where: { id: dbUser.id } })

    return reply.send({ success: true, data: { message: 'Database user deleted' } })
  })
}
