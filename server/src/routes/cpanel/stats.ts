import type { FastifyInstance } from 'fastify'
import prisma from '../../db/client.js'
import { requireAuth } from '../../middleware/auth.js'
import { exec } from '../../core/exec.js'

export default async function statsRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth]

  // GET /api/cpanel/stats — account resource usage summary
  fastify.get('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : parseInt((request.query as Record<string, string>).accountId ?? '0', 10)

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        package: true,
        _count: {
          select: {
            emailAccounts: true, databases: true, ftpAccounts: true,
            subdomains: true, addonDomains: true, parkedDomains: true,
            sslCertificates: true, cronJobs: true,
          },
        },
      },
    })

    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    // Get actual disk usage
    const duResult = await exec('du', ['-sb', account.homedir])
    const diskUsedBytes = parseInt(duResult.stdout.split('\t')[0] ?? '0', 10)
    const diskUsedMb = Math.floor(diskUsedBytes / 1024 / 1024)

    // Update DB with current usage
    await prisma.account.update({ where: { id: accountId }, data: { diskUsedMb: BigInt(diskUsedMb) } })

    const pkg = account.package
    return reply.send({
      success: true,
      data: {
        diskUsedMb,
        diskLimitMb: pkg ? Number(pkg.diskMb) : 0,
        bandwidthUsedMb: Number(account.bandwidthUsedMb),
        bandwidthLimitMb: pkg ? Number(pkg.bandwidthMb) : 0,
        counts: account._count,
        limits: pkg ? {
          maxEmailAccounts: pkg.maxEmailAccounts,
          maxDatabases: pkg.maxDatabases,
          maxFtpAccounts: pkg.maxFtpAccounts,
          maxSubdomains: pkg.maxSubdomains,
          maxAddonDomains: pkg.maxAddonDomains,
          maxParkedDomains: pkg.maxParkedDomains,
          maxCronJobs: pkg.maxCronJobs,
        } : null,
      },
    })
  })

  // GET /api/cpanel/stats/bandwidth — bandwidth usage over time (placeholder for log parsing)
  fastify.get('/bandwidth', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : parseInt((request.query as Record<string, string>).accountId ?? '0', 10)

    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    // Read nginx access log and count bytes for this account's domain
    const logFile = `/var/log/nginx/${account.username}.access.log`
    const result = await exec('awk', ['{sum += $10} END {print sum}', logFile])
    const bytes = parseInt(result.stdout || '0', 10)

    return reply.send({
      success: true,
      data: { domain: account.domain, bandwidthBytes: bytes, bandwidthMb: Math.floor(bytes / 1024 / 1024) },
    })
  })
}
