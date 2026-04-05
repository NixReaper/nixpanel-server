import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAdminOrReseller } from '../../middleware/auth.js'
import { exec, validateUsername, validateDomain } from '../../core/exec.js'
import { enableVhost, disableVhost } from '../../core/nginx.js'
import { createZone, removeZone } from '../../core/dns.js'
import { config } from '../../config.js'

const CreateAccountSchema = z.object({
  username: z.string().min(1).max(32),
  password: z.string().min(8),
  email: z.string().email(),
  domain: z.string().min(4),
  packageId: z.number().int().positive().optional(),
  resellerId: z.number().int().positive().optional(),
  ipId: z.number().int().positive().optional(),
})

const UpdateAccountSchema = z.object({
  email: z.string().email().optional(),
  packageId: z.number().int().positive().optional(),
  password: z.string().min(8).optional(),
  notes: z.string().max(500).optional(),
})

export default async function accountRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAdminOrReseller]

  // GET /api/nixserver/accounts
  fastify.get('/', { preHandler }, async (request, reply) => {
    const q = request.query as Record<string, string>
    const page = Math.max(1, parseInt(q.page ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '25', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (q.search) {
      where.OR = [
        { username: { contains: q.search } },
        { domain: { contains: q.search } },
        { email: { contains: q.search } },
      ]
    }
    if (q.status) where.status = q.status
    if (request.user!.role === 'reseller') where.resellerId = request.user!.sub

    const [items, total] = await Promise.all([
      prisma.account.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, username: true, domain: true, email: true, status: true,
          diskUsedMb: true, bandwidthUsedMb: true, ipAddress: true,
          createdAt: true, suspendedAt: true, suspendReason: true,
          package: { select: { name: true, diskMb: true, bandwidthMb: true } },
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

  // GET /api/nixserver/accounts/:id
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const where: Record<string, unknown> = { id: parseInt(id, 10) }
    if (request.user!.role === 'reseller') where.resellerId = request.user!.sub

    const account = await prisma.account.findFirst({
      where,
      include: {
        package: true,
        reseller: { select: { username: true, company: true } },
        ip: true,
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

  // POST /api/nixserver/accounts
  fastify.post('/', { preHandler }, async (request, reply) => {
    const body = CreateAccountSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const { username, password, email, domain, packageId, resellerId, ipId } = body.data

    if (!validateUsername(username)) {
      return reply.code(400).send({ success: false, error: 'Invalid username format' })
    }
    if (!validateDomain(domain)) {
      return reply.code(400).send({ success: false, error: 'Invalid domain format' })
    }

    const exists = await prisma.account.findFirst({
      where: { OR: [{ username }, { domain }] },
    })
    if (exists) {
      return reply.code(409).send({ success: false, error: 'Username or domain already in use' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const homedir = `${config.paths.homeDir}/${username}`

    // Create system user
    const userAdd = await exec('useradd', [
      '-m', '-d', homedir, '-s', '/bin/false', username,
    ])
    if (userAdd.exitCode !== 0 && !config.isDev) {
      return reply.code(500).send({ success: false, error: `Failed to create system user: ${userAdd.stderr}` })
    }

    // Create directory structure
    const dirs = [
      `${homedir}/public_html`,
      `${homedir}/logs`,
      `${homedir}/tmp`,
      `${homedir}/mail`,
      `${homedir}/.ssh`,
    ]
    for (const dir of dirs) {
      await exec('mkdir', ['-p', dir])
    }
    await exec('chown', ['-R', `${username}:${username}`, homedir])
    await exec('chmod', ['750', homedir])
    await exec('chmod', ['755', `${homedir}/public_html`])

    // Resolve IP for vhost
    let ipAddress: string | undefined
    if (ipId) {
      const ip = await prisma.ipAddress.findUnique({ where: { id: ipId } })
      ipAddress = ip?.address
    }

    // Create account in DB
    const account = await prisma.account.create({
      data: {
        username,
        passwordHash,
        email,
        domain,
        homedir,
        status: 'active',
        packageId: packageId ?? null,
        resellerId: resellerId ?? (request.user!.role === 'reseller' ? request.user!.sub : null),
        ipId: ipId ?? null,
        ipAddress: ipAddress ?? null,
      },
    })

    // Create DNS zone
    if (ipAddress) {
      const serverHostname = (await exec('hostname', ['-f'])).stdout || 'ns1.server.com'
      try {
        const zoneFile = await createZone({
          domain,
          ip: ipAddress,
          ns1: `ns1.${domain}`,
          ns2: `ns2.${domain}`,
        })
        await prisma.dnsZone.create({
          data: { domain, zoneFile, accountId: account.id },
        })
      } catch (e) {
        // Non-fatal — log and continue
        console.warn(`DNS zone creation failed for ${domain}:`, e)
      }
    }

    // Create nginx vhost
    try {
      await enableVhost({
        domain,
        username,
        documentRoot: `${homedir}/public_html`,
      })
    } catch (e) {
      console.warn(`Nginx vhost creation failed for ${domain}:`, e)
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'account.create',
        target: username,
        details: `Created hosting account for domain ${domain}`,
        sourceIp: request.ip,
        adminId: request.user!.role === 'admin' ? request.user!.sub : null,
      },
    })

    const { passwordHash: _, ...safe } = account
    return reply.code(201).send({ success: true, data: safe })
  })

  // PUT /api/nixserver/accounts/:id
  fastify.put('/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = UpdateAccountSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const where: Record<string, unknown> = { id: parseInt(id, 10) }
    if (request.user!.role === 'reseller') where.resellerId = request.user!.sub

    const existing = await prisma.account.findFirst({ where })
    if (!existing) return reply.code(404).send({ success: false, error: 'Account not found' })

    const updateData: Record<string, unknown> = {}
    if (body.data.email) updateData.email = body.data.email
    if (body.data.packageId) updateData.packageId = body.data.packageId
    if (body.data.notes !== undefined) updateData.notes = body.data.notes
    if (body.data.password) {
      updateData.passwordHash = await bcrypt.hash(body.data.password, 12)
      // Update system user password
      await exec('passwd', ['--stdin', existing.username])
    }

    const updated = await prisma.account.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    })

    const { passwordHash: _, ...safe } = updated
    return reply.send({ success: true, data: safe })
  })

  // POST /api/nixserver/accounts/:id/suspend
  fastify.post('/:id/suspend', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { reason } = (request.body as Record<string, string>) ?? {}

    const account = await prisma.account.findFirst({
      where: { id: parseInt(id, 10), status: 'active' },
    })
    if (!account) return reply.code(404).send({ success: false, error: 'Active account not found' })

    await exec('usermod', ['-L', account.username])

    await prisma.account.update({
      where: { id: account.id },
      data: { status: 'suspended', suspendedAt: new Date(), suspendReason: reason ?? null },
    })

    await prisma.auditLog.create({
      data: {
        action: 'account.suspend',
        target: account.username,
        details: reason ?? 'No reason given',
        sourceIp: request.ip,
        adminId: request.user!.role === 'admin' ? request.user!.sub : null,
      },
    })

    return reply.send({ success: true, data: { message: `Account ${account.username} suspended` } })
  })

  // POST /api/nixserver/accounts/:id/unsuspend
  fastify.post('/:id/unsuspend', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const account = await prisma.account.findFirst({
      where: { id: parseInt(id, 10), status: 'suspended' },
    })
    if (!account) return reply.code(404).send({ success: false, error: 'Suspended account not found' })

    await exec('usermod', ['-U', account.username])

    await prisma.account.update({
      where: { id: account.id },
      data: { status: 'active', suspendedAt: null, suspendReason: null },
    })

    await prisma.auditLog.create({
      data: {
        action: 'account.unsuspend',
        target: account.username,
        sourceIp: request.ip,
        adminId: request.user!.role === 'admin' ? request.user!.sub : null,
      },
    })

    return reply.send({ success: true, data: { message: `Account ${account.username} unsuspended` } })
  })

  // DELETE /api/nixserver/accounts/:id
  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { removeFiles } = (request.body as Record<string, boolean>) ?? {}

    const account = await prisma.account.findUnique({ where: { id: parseInt(id, 10) } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    // Remove nginx vhost
    try {
      await disableVhost(account.domain)
    } catch (e) {
      console.warn(`Failed to remove vhost for ${account.domain}:`, e)
    }

    // Remove DNS zone
    try {
      await removeZone(account.domain)
    } catch (e) {
      console.warn(`Failed to remove DNS zone for ${account.domain}:`, e)
    }

    // Remove system user
    const delArgs = removeFiles ? ['-r', account.username] : [account.username]
    await exec('userdel', delArgs)

    // Mark as terminated in DB (cascade deletes related records)
    await prisma.account.update({
      where: { id: account.id },
      data: { status: 'terminated', terminatedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        action: 'account.terminate',
        target: account.username,
        details: removeFiles ? 'Files removed' : 'Files retained',
        sourceIp: request.ip,
        adminId: request.user!.role === 'admin' ? request.user!.sub : null,
      },
    })

    return reply.send({ success: true, data: { message: `Account ${account.username} terminated` } })
  })

  // POST /api/nixserver/accounts/bulk
  fastify.post('/bulk', { preHandler }, async (request, reply) => {
    const body = z.object({
      action: z.enum(['suspend', 'unsuspend', 'terminate']),
      ids: z.array(z.number().int().positive()).min(1).max(100),
      reason: z.string().optional(),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const { action, ids, reason } = body.data
    const results: { id: number; success: boolean; error?: string }[] = []

    for (const id of ids) {
      try {
        const account = await prisma.account.findUnique({ where: { id } })
        if (!account) {
          results.push({ id, success: false, error: 'Not found' })
          continue
        }

        if (action === 'suspend') {
          await exec('usermod', ['-L', account.username])
          await prisma.account.update({
            where: { id },
            data: { status: 'suspended', suspendedAt: new Date(), suspendReason: reason ?? null },
          })
        } else if (action === 'unsuspend') {
          await exec('usermod', ['-U', account.username])
          await prisma.account.update({
            where: { id },
            data: { status: 'active', suspendedAt: null, suspendReason: null },
          })
        } else if (action === 'terminate') {
          await exec('userdel', [account.username])
          await prisma.account.update({
            where: { id },
            data: { status: 'terminated', terminatedAt: new Date() },
          })
        }

        results.push({ id, success: true })
      } catch (e) {
        results.push({ id, success: false, error: String(e) })
      }
    }

    return reply.send({ success: true, data: results })
  })
}
