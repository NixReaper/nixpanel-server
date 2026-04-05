import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAdmin } from '../../middleware/auth.js'

const PackageSchema = z.object({
  name: z.string().min(1).max(100),
  diskMb: z.number().int().min(0),
  bandwidthMb: z.number().int().min(0),
  maxDatabases: z.number().int().min(0),
  maxEmailAccounts: z.number().int().min(0),
  maxSubdomains: z.number().int().min(0),
  maxAddonDomains: z.number().int().min(0),
  maxParkedDomains: z.number().int().min(0),
  maxFtpAccounts: z.number().int().min(0),
  maxCronJobs: z.number().int().min(0),
  phpVersion: z.string().default('8.3'),
  sslEnabled: z.boolean().default(true),
  backupEnabled: z.boolean().default(true),
  dedicatedIp: z.boolean().default(false),
  notes: z.string().max(500).optional(),
})

export default async function packageRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const packages = await prisma.package.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { accounts: true } } },
    })
    return reply.send({ success: true, data: packages })
  })

  fastify.get('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const pkg = await prisma.package.findUnique({
      where: { id: parseInt(id, 10) },
      include: { _count: { select: { accounts: true } } },
    })
    if (!pkg) return reply.code(404).send({ success: false, error: 'Package not found' })
    return reply.send({ success: true, data: pkg })
  })

  fastify.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = PackageSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const existing = await prisma.package.findUnique({ where: { name: body.data.name } })
    if (existing) return reply.code(409).send({ success: false, error: 'Package name already in use' })

    const pkg = await prisma.package.create({
      data: {
        ...body.data,
        diskMb: BigInt(body.data.diskMb),
        bandwidthMb: BigInt(body.data.bandwidthMb),
      },
    })
    return reply.code(201).send({ success: true, data: pkg })
  })

  fastify.put('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = PackageSchema.partial().safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const existing = await prisma.package.findUnique({ where: { id: parseInt(id, 10) } })
    if (!existing) return reply.code(404).send({ success: false, error: 'Package not found' })

    const updateData: Record<string, unknown> = { ...body.data }
    if (body.data.diskMb !== undefined) updateData.diskMb = BigInt(body.data.diskMb)
    if (body.data.bandwidthMb !== undefined) updateData.bandwidthMb = BigInt(body.data.bandwidthMb)

    const pkg = await prisma.package.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    })
    return reply.send({ success: true, data: pkg })
  })

  fastify.delete('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const pkg = await prisma.package.findUnique({
      where: { id: parseInt(id, 10) },
      include: { _count: { select: { accounts: true } } },
    })
    if (!pkg) return reply.code(404).send({ success: false, error: 'Package not found' })
    if (pkg._count.accounts > 0) {
      return reply.code(409).send({ success: false, error: `Cannot delete — ${pkg._count.accounts} accounts use this package` })
    }
    await prisma.package.delete({ where: { id: parseInt(id, 10) } })
    return reply.send({ success: true, data: { message: 'Package deleted' } })
  })
}
