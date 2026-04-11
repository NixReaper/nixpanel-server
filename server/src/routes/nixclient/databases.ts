import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAuth } from '../../middleware/auth.js'
import {
  createDatabase,
  dropDatabase,
  createDatabaseUser,
  grantPrivileges,
  dropDatabaseUser,
} from '../../core/mariadb.js'

const nameSchema = z.string().min(1).max(32).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed')

export default async function databaseRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth]

  // GET /api/nixclient/databases
  fastify.get('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user'
      ? user.sub
      : parseInt((request.query as Record<string, string>).accountId ?? '0', 10)

    const databases = await prisma.database.findMany({
      where: { accountId },
      include: { dbUsers: { select: { id: true, username: true, host: true, privileges: true } } },
      orderBy: { name: 'asc' },
    })
    return reply.send({ success: true, data: databases })
  })

  // POST /api/nixclient/databases
  fastify.post('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user'
      ? user.sub
      : parseInt((request.body as Record<string, string>).accountId ?? '0', 10)

    const body = z.object({
      name: nameSchema,
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

    if (account.package && account.package.maxDatabases > 0) {
      const count = await prisma.database.count({ where: { accountId } })
      if (count >= account.package.maxDatabases) {
        return reply.code(429).send({ success: false, error: 'Database limit reached' })
      }
    }

    const dbName = `${account.username}_${body.data.name}`
    const exists = await prisma.database.findUnique({ where: { name: dbName } })
    if (exists) return reply.code(409).send({ success: false, error: 'Database already exists' })

    await createDatabase(dbName, body.data.charset, body.data.collation)

    const db = await prisma.database.create({
      data: { name: dbName, charset: body.data.charset, collation: body.data.collation, accountId },
    })
    return reply.code(201).send({ success: true, data: db })
  })

  // DELETE /api/nixclient/databases/:id
  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const db = await prisma.database.findFirst({
      where: {
        id: parseInt(id, 10),
        ...(user.role === 'user' ? { accountId: user.sub } : {}),
      },
      include: { dbUsers: true },
    })
    if (!db) return reply.code(404).send({ success: false, error: 'Database not found' })

    // Drop all associated users first
    for (const dbUser of db.dbUsers) {
      await dropDatabaseUser(dbUser.username)
    }
    await dropDatabase(db.name)
    await prisma.database.delete({ where: { id: db.id } })

    return reply.send({ success: true, data: { message: `Database ${db.name} deleted` } })
  })

  // POST /api/nixclient/databases/:id/users
  fastify.post('/:id/users', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const body = z.object({
      username: nameSchema,
      password: z.string().min(8),
      privileges: z.enum(['ALL', 'SELECT', 'SELECT,INSERT,UPDATE,DELETE']).default('ALL'),
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

    await createDatabaseUser(dbUsername, body.data.password)
    await grantPrivileges(db.name, dbUsername, body.data.privileges)

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

  // DELETE /api/nixclient/databases/:id/users/:userId
  fastify.delete('/:id/users/:userId', { preHandler }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string }
    const user = request.user!

    const dbUser = await prisma.databaseUser.findFirst({
      where: {
        id: parseInt(userId, 10),
        databaseId: parseInt(id, 10),
        ...(user.role === 'user' ? { database: { accountId: user.sub } } : {}),
      },
    })
    if (!dbUser) return reply.code(404).send({ success: false, error: 'Database user not found' })

    await dropDatabaseUser(dbUser.username)
    await prisma.databaseUser.delete({ where: { id: dbUser.id } })

    return reply.send({ success: true, data: { message: 'Database user deleted' } })
  })
}
