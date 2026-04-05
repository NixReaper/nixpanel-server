import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAdmin } from '../../middleware/auth.js'

const CreateResellerSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(8),
  email: z.string().email(),
  contactName: z.string().max(255).optional(),
  company: z.string().max(255).optional(),
  maxAccounts: z.number().int().min(0).default(10),
  diskLimitMb: z.number().int().min(0).default(51200),
  bandwidthLimitMb: z.number().int().min(0).default(512000),
  brandName: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
})

export default async function resellerRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const q = request.query as Record<string, string>
    const page = Math.max(1, parseInt(q.page ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '25', 10)))

    const where: Record<string, unknown> = {}
    if (q.search) {
      where.OR = [
        { username: { contains: q.search } },
        { email: { contains: q.search } },
        { company: { contains: q.search } },
      ]
    }
    if (q.status) where.status = q.status

    const [items, total] = await Promise.all([
      prisma.reseller.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, username: true, email: true, company: true, contactName: true,
          status: true, maxAccounts: true, diskLimitMb: true, bandwidthLimitMb: true,
          diskUsedMb: true, bandwidthUsedMb: true, createdAt: true,
          _count: { select: { accounts: true } },
        },
      }),
      prisma.reseller.count({ where }),
    ])

    return reply.send({
      success: true,
      data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  })

  fastify.get('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const reseller = await prisma.reseller.findUnique({
      where: { id: parseInt(id, 10) },
      include: { _count: { select: { accounts: true } } },
    })
    if (!reseller) return reply.code(404).send({ success: false, error: 'Reseller not found' })
    const { passwordHash: _, ...safe } = reseller
    return reply.send({ success: true, data: safe })
  })

  fastify.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = CreateResellerSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const exists = await prisma.reseller.findFirst({
      where: { OR: [{ username: body.data.username }, { email: body.data.email }] },
    })
    if (exists) return reply.code(409).send({ success: false, error: 'Username or email already in use' })

    const passwordHash = await bcrypt.hash(body.data.password, 12)
    const reseller = await prisma.reseller.create({
      data: {
        ...body.data,
        passwordHash,
        diskLimitMb: BigInt(body.data.diskLimitMb),
        bandwidthLimitMb: BigInt(body.data.bandwidthLimitMb),
      },
    })

    const { passwordHash: _, ...safe } = reseller
    return reply.code(201).send({ success: true, data: safe })
  })

  fastify.put('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = CreateResellerSchema.omit({ password: true, username: true }).partial().safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const existing = await prisma.reseller.findUnique({ where: { id: parseInt(id, 10) } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Reseller not found' })

    const updateData: Record<string, unknown> = { ...body.data }
    if (body.data.diskLimitMb !== undefined) updateData.diskLimitMb = BigInt(body.data.diskLimitMb)
    if (body.data.bandwidthLimitMb !== undefined) updateData.bandwidthLimitMb = BigInt(body.data.bandwidthLimitMb)

    const reseller = await prisma.reseller.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    })
    const { passwordHash: _, ...safe } = reseller
    return reply.send({ success: true, data: safe })
  })

  fastify.post('/:id/suspend', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.reseller.update({
      where: { id: parseInt(id, 10) },
      data: { status: 'suspended' },
    })
    return reply.send({ success: true, data: { message: 'Reseller suspended' } })
  })

  fastify.post('/:id/unsuspend', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.reseller.update({
      where: { id: parseInt(id, 10) },
      data: { status: 'active' },
    })
    return reply.send({ success: true, data: { message: 'Reseller unsuspended' } })
  })

  fastify.delete('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const reseller = await prisma.reseller.findUnique({
      where: { id: parseInt(id, 10) },
      include: { _count: { select: { accounts: true } } },
    })
    if (!reseller) return reply.code(404).send({ success: false, error: 'Reseller not found' })
    if (reseller._count.accounts > 0) {
      return reply.code(409).send({ success: false, error: `Cannot delete — reseller has ${reseller._count.accounts} accounts` })
    }
    await prisma.reseller.delete({ where: { id: parseInt(id, 10) } })
    return reply.send({ success: true, data: { message: 'Reseller deleted' } })
  })
}
