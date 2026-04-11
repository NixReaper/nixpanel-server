import type { FastifyInstance } from 'fastify'
import prisma from '../../../db/client.js'
import { requireAdminOrReseller } from '../../../middleware/auth.js'

const preHandler = [requireAdminOrReseller]

export default async function listRoutes(fastify: FastifyInstance) {
  // GET /api/nixserver/accounts
  fastify.get('/', { preHandler }, async (request, reply) => {
    const q = request.query as Record<string, string>
    const page  = Math.max(1, parseInt(q.page  ?? '1',  10))
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '25', 10)))
    const skip  = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (q.search) {
      where.OR = [
        { username: { contains: q.search } },
        { domain:   { contains: q.search } },
        { email:    { contains: q.search } },
      ]
    }
    if (q.status) where.status = q.status
    if (request.user!.role === 'reseller') where.resellerId = request.user!.sub

    const [items, total] = await Promise.all([
      prisma.account.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, username: true, domain: true, email: true, status: true,
          diskUsedMb: true, bandwidthUsedMb: true, ipAddress: true,
          createdAt: true, suspendedAt: true, suspendReason: true,
          package:  { select: { name: true, diskMb: true, bandwidthMb: true } },
          reseller: { select: { username: true } },
        },
      }),
      prisma.account.count({ where }),
    ])

    return reply.send({
      success: true,
      data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  })

  // GET /api/nixserver/accounts/stats
  fastify.get('/stats', { preHandler }, async (request, reply) => {
    const where = request.user!.role === 'reseller' ? { resellerId: request.user!.sub } : {}

    const [total, active, suspended, terminated] = await Promise.all([
      prisma.account.count({ where }),
      prisma.account.count({ where: { ...where, status: 'active' } }),
      prisma.account.count({ where: { ...where, status: 'suspended' } }),
      prisma.account.count({ where: { ...where, status: 'terminated' } }),
    ])

    return reply.send({ success: true, data: { total, active, suspended, terminated } })
  })

  // GET /api/nixserver/accounts/parked-domains
  fastify.get('/parked-domains', { preHandler }, async (request, reply) => {
    const where = request.user!.role === 'reseller'
      ? { account: { resellerId: request.user!.sub } } : {}

    const items = await prisma.parkedDomain.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { account: { select: { username: true, domain: true } } },
    })
    return reply.send({ success: true, data: items })
  })

  // GET /api/nixserver/accounts/subdomains
  fastify.get('/subdomains', { preHandler }, async (request, reply) => {
    const where = request.user!.role === 'reseller'
      ? { account: { resellerId: request.user!.sub } } : {}

    const items = await prisma.subdomain.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { account: { select: { username: true } } },
    })
    return reply.send({ success: true, data: items })
  })

  // GET /api/nixserver/accounts/over-quota
  fastify.get('/over-quota', { preHandler }, async (request, reply) => {
    const resellerWhere = request.user!.role === 'reseller' ? { resellerId: request.user!.sub } : {}

    const accounts = await prisma.account.findMany({
      where: { ...resellerWhere, package: { isNot: null } },
      select: {
        id: true, username: true, domain: true, status: true, diskUsedMb: true,
        package: { select: { name: true, diskMb: true, bandwidthMb: true } },
      },
    })

    const overQuota = accounts.filter(
      (a: typeof accounts[number]) => a.package && a.diskUsedMb > a.package.diskMb
    )
    return reply.send({ success: true, data: overQuota })
  })

  // GET /api/nixserver/accounts/bandwidth
  fastify.get('/bandwidth', { preHandler }, async (request, reply) => {
    const resellerWhere = request.user!.role === 'reseller' ? { resellerId: request.user!.sub } : {}

    const items = await prisma.account.findMany({
      where: resellerWhere,
      orderBy: { bandwidthUsedMb: 'desc' },
      select: {
        id: true, username: true, domain: true, status: true,
        bandwidthUsedMb: true, suspendReason: true,
        package: { select: { name: true, bandwidthMb: true } },
      },
    })
    return reply.send({ success: true, data: items })
  })

  // GET /api/nixserver/accounts/:id
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const where: Record<string, unknown> = { id: parseInt(id, 10) }
    if (request.user!.role === 'reseller') where.resellerId = request.user!.sub

    const account = await prisma.account.findFirst({
      where,
      include: {
        package:  true,
        reseller: { select: { username: true, company: true } },
        ip:       true,
        dnsZones: { select: { id: true, domain: true, status: true } },
        _count: {
          select: {
            emailAccounts: true, databases: true, ftpAccounts: true,
            subdomains: true, addonDomains: true, sslCertificates: true,
          },
        },
      },
    })

    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })
    const { passwordHash, ...safe } = account
    return reply.send({ success: true, data: safe })
  })
}
