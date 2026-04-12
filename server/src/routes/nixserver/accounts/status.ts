import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../../db/client.js'
import { requireAdminOrReseller } from '../../../middleware/auth.js'
import { exec } from '../../../core/exec.js'
import { enableVhost, disableVhost, suspendVhost, disablePhpFpmPool } from '../../../core/apache.js'
import { removeZone } from '../../../core/dns.js'

const preHandler = [requireAdminOrReseller]

export default async function statusRoutes(fastify: FastifyInstance) {
  // POST /api/nixserver/accounts/:id/suspend
  fastify.post('/:id/suspend', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { reason } = (request.body as Record<string, string>) ?? {}

    const account = await prisma.account.findFirst({
      where: { id: parseInt(id, 10), status: 'active' },
    })
    if (!account) return reply.code(404).send({ success: false, error: 'Active account not found' })

    await exec('usermod', ['-L', account.username])
    try { await suspendVhost(account.domain, account.username) } catch (e) {
      console.warn(`suspendVhost failed for ${account.domain}:`, e)
    }

    await prisma.account.update({
      where: { id: account.id },
      data:  { status: 'suspended', suspendedAt: new Date(), suspendReason: reason ?? null },
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
    try {
      await enableVhost({ domain: account.domain, username: account.username, documentRoot: `${account.homedir}/public_html` })
    } catch (e) {
      console.warn(`enableVhost failed on unsuspend for ${account.domain}:`, e)
    }

    await prisma.account.update({
      where: { id: account.id },
      data:  { status: 'active', suspendedAt: null, suspendReason: null },
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

  // POST /api/nixserver/accounts/unsuspend-bandwidth-exceeded
  fastify.post('/unsuspend-bandwidth-exceeded', { preHandler }, async (request, reply) => {
    const resellerWhere = request.user!.role === 'reseller' ? { resellerId: request.user!.sub } : {}

    const accounts = await prisma.account.findMany({
      where: { ...resellerWhere, status: 'suspended', suspendReason: { contains: 'bandwidth' } },
    })

    const results: { id: number; username: string; success: boolean; error?: string }[] = []

    for (const account of accounts) {
      try {
        await exec('usermod', ['-U', account.username])
        await prisma.account.update({
          where: { id: account.id },
          data:  { status: 'active', suspendedAt: null, suspendReason: null },
        })
        results.push({ id: account.id, username: account.username, success: true })
      } catch (e) {
        results.push({ id: account.id, username: account.username, success: false, error: String(e) })
      }
    }

    await prisma.auditLog.create({
      data: {
        action: 'account.unsuspend-bandwidth-exceeded',
        target: `${results.length} accounts`,
        sourceIp: request.ip,
        adminId: request.user!.role === 'admin' ? request.user!.sub : null,
      },
    })

    return reply.send({ success: true, data: results })
  })

  // DELETE /api/nixserver/accounts/:id
  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { removeFiles } = (request.body as Record<string, boolean>) ?? {}

    const account = await prisma.account.findUnique({ where: { id: parseInt(id, 10) } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    try { await disableVhost(account.domain) } catch (e) {
      console.warn(`Failed to remove vhost for ${account.domain}:`, e)
    }
    try {
      const phpVersion = account.packageId
        ? (await prisma.package.findUnique({ where: { id: account.packageId } }))?.phpVersion ?? '8.3'
        : '8.3'
      await disablePhpFpmPool(account.username, phpVersion)
    } catch (e) {
      console.warn(`Failed to remove PHP-FPM pool for ${account.username}:`, e)
    }
    try { await removeZone(account.domain) } catch (e) {
      console.warn(`Failed to remove DNS zone for ${account.domain}:`, e)
    }

    await exec('userdel', removeFiles ? ['-r', account.username] : [account.username])

    await prisma.account.update({
      where: { id: account.id },
      data:  { status: 'terminated', terminatedAt: new Date() },
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
      ids:    z.array(z.number().int().positive()).min(1).max(100),
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
        if (!account) { results.push({ id, success: false, error: 'Not found' }); continue }

        if (action === 'suspend') {
          await exec('usermod', ['-L', account.username])
          await prisma.account.update({
            where: { id },
            data:  { status: 'suspended', suspendedAt: new Date(), suspendReason: reason ?? null },
          })
        } else if (action === 'unsuspend') {
          await exec('usermod', ['-U', account.username])
          await prisma.account.update({
            where: { id },
            data:  { status: 'active', suspendedAt: null, suspendReason: null },
          })
        } else if (action === 'terminate') {
          await exec('userdel', [account.username])
          await prisma.account.update({
            where: { id },
            data:  { status: 'terminated', terminatedAt: new Date() },
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
