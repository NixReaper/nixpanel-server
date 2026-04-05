import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAdminOrReseller } from '../../middleware/auth.js'
import { createZone, removeZone, generateZoneFile } from '../../core/dns.js'
import { exec } from '../../core/exec.js'

const DnsRecordSchema = z.object({
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'PTR', 'CAA']),
  name: z.string().min(1).max(255),
  value: z.string().min(1).max(500),
  ttl: z.number().int().min(60).max(86400).default(3600),
  priority: z.number().int().min(0).max(65535).optional(),
})

export default async function dnsRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAdminOrReseller]

  // GET /api/whm/dns
  fastify.get('/', { preHandler }, async (request, reply) => {
    const q = request.query as Record<string, string>
    const where: Record<string, unknown> = {}
    if (q.search) where.domain = { contains: q.search }
    if (q.accountId) where.accountId = parseInt(q.accountId, 10)

    const zones = await prisma.dnsZone.findMany({
      where,
      orderBy: { domain: 'asc' },
      include: {
        account: { select: { username: true } },
        _count: { select: { records: true } },
      },
    })
    return reply.send({ success: true, data: zones })
  })

  // GET /api/whm/dns/:id
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const zone = await prisma.dnsZone.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        records: { orderBy: [{ type: 'asc' }, { name: 'asc' }] },
        account: { select: { username: true, domain: true } },
      },
    })
    if (!zone) return reply.code(404).send({ success: false, error: 'Zone not found' })
    return reply.send({ success: true, data: zone })
  })

  // POST /api/whm/dns/:id/records
  fastify.post('/:id/records', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = DnsRecordSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const zone = await prisma.dnsZone.findUnique({
      where: { id: parseInt(id, 10) },
      include: { account: true },
    })
    if (!zone) return reply.code(404).send({ success: false, error: 'Zone not found' })

    const record = await prisma.dnsRecord.create({
      data: { ...body.data, zoneId: zone.id },
    })

    // Regenerate zone file and reload
    await rebuildZone(zone.id)

    return reply.code(201).send({ success: true, data: record })
  })

  // PUT /api/whm/dns/:zoneId/records/:recordId
  fastify.put('/:zoneId/records/:recordId', { preHandler }, async (request, reply) => {
    const { zoneId, recordId } = request.params as { zoneId: string; recordId: string }
    const body = DnsRecordSchema.partial().safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const record = await prisma.dnsRecord.findFirst({
      where: { id: parseInt(recordId, 10), zoneId: parseInt(zoneId, 10) },
    })
    if (!record) return reply.code(404).send({ success: false, error: 'Record not found' })

    const updated = await prisma.dnsRecord.update({
      where: { id: parseInt(recordId, 10) },
      data: body.data,
    })

    await rebuildZone(parseInt(zoneId, 10))

    return reply.send({ success: true, data: updated })
  })

  // DELETE /api/whm/dns/:zoneId/records/:recordId
  fastify.delete('/:zoneId/records/:recordId', { preHandler }, async (request, reply) => {
    const { zoneId, recordId } = request.params as { zoneId: string; recordId: string }

    const record = await prisma.dnsRecord.findFirst({
      where: { id: parseInt(recordId, 10), zoneId: parseInt(zoneId, 10) },
    })
    if (!record) return reply.code(404).send({ success: false, error: 'Record not found' })

    await prisma.dnsRecord.delete({ where: { id: parseInt(recordId, 10) } })
    await rebuildZone(parseInt(zoneId, 10))

    return reply.send({ success: true, data: { message: 'Record deleted' } })
  })

  // POST /api/whm/dns/:id/reload
  fastify.post('/:id/reload', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await rebuildZone(parseInt(id, 10))
    return reply.send({ success: true, data: { message: 'Zone reloaded' } })
  })
}

async function rebuildZone(zoneId: number): Promise<void> {
  const zone = await prisma.dnsZone.findUnique({
    where: { id: zoneId },
    include: { records: true, account: true },
  })
  if (!zone || !zone.zoneFile) return

  // Bump serial
  const serial = Math.floor(Date.now() / 1000)

  const zoneContent = generateZoneFile({
    domain: zone.domain,
    ip: zone.account.ipAddress ?? '127.0.0.1',
    ns1: `ns1.${zone.domain}`,
    ns2: `ns2.${zone.domain}`,
    serial,
  })

  const { writeFile } = await import('fs/promises')
  await writeFile(zone.zoneFile, zoneContent, 'utf8')

  await prisma.dnsZone.update({ where: { id: zoneId }, data: { serial: BigInt(serial) } })
  await exec('rndc', ['reload', zone.domain])
}
