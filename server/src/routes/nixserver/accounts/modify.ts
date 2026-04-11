import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../../db/client.js'
import { requireAdminOrReseller } from '../../../middleware/auth.js'
import { exec } from '../../../core/exec.js'

const UpdateAccountSchema = z.object({
  email:     z.string().email().optional(),
  packageId: z.number().int().positive().optional(),
  password:  z.string().min(8).optional(),
  notes:     z.string().max(500).optional(),
})

const preHandler = [requireAdminOrReseller]

export default async function modifyRoutes(fastify: FastifyInstance) {
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
    if (body.data.email)              updateData.email     = body.data.email
    if (body.data.packageId)          updateData.packageId = body.data.packageId
    if (body.data.notes !== undefined) updateData.notes    = body.data.notes
    if (body.data.password) {
      updateData.passwordHash = await bcrypt.hash(body.data.password, 12)
      await exec('passwd', ['--stdin', existing.username])
    }

    const updated = await prisma.account.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    })

    const { passwordHash: _, ...safe } = updated
    return reply.send({ success: true, data: safe })
  })

  // PUT /api/nixserver/accounts/:id/quota
  fastify.put('/:id/quota', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({
      diskMb:      z.number().int().positive(),
      bandwidthMb: z.number().int().positive(),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const where: Record<string, unknown> = { id: parseInt(id, 10) }
    if (request.user!.role === 'reseller') where.resellerId = request.user!.sub

    const account = await prisma.account.findFirst({ where, include: { package: true } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    if (account.packageId) {
      await prisma.package.update({
        where: { id: account.packageId },
        data:  { diskMb: body.data.diskMb, bandwidthMb: body.data.bandwidthMb },
      })
    }

    await prisma.auditLog.create({
      data: {
        action: 'account.quota-modification',
        target: account.username,
        details: `diskMb=${body.data.diskMb}, bandwidthMb=${body.data.bandwidthMb}`,
        sourceIp: request.ip,
        adminId: request.user!.role === 'admin' ? request.user!.sub : null,
      },
    })

    return reply.send({ success: true, data: { message: 'Quota updated', ...body.data } })
  })

  // POST /api/nixserver/accounts/:id/change-ip
  fastify.post('/:id/change-ip', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ ipAddress: z.string().min(1) }).safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const where: Record<string, unknown> = { id: parseInt(id, 10) }
    if (request.user!.role === 'reseller') where.resellerId = request.user!.sub

    const account = await prisma.account.findFirst({ where })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const updated = await prisma.account.update({
      where: { id: account.id },
      data:  { ipAddress: body.data.ipAddress },
    })

    await prisma.auditLog.create({
      data: {
        action: 'account.change-ip',
        target: account.username,
        details: `IP changed to ${body.data.ipAddress}`,
        sourceIp: request.ip,
        adminId: request.user!.role === 'admin' ? request.user!.sub : null,
      },
    })

    const { passwordHash: _, ...safe } = updated
    return reply.send({ success: true, data: safe })
  })

  // POST /api/nixserver/accounts/:id/reset-bandwidth
  fastify.post('/:id/reset-bandwidth', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const where: Record<string, unknown> = { id: parseInt(id, 10) }
    if (request.user!.role === 'reseller') where.resellerId = request.user!.sub

    const account = await prisma.account.findFirst({ where })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    await prisma.account.update({ where: { id: account.id }, data: { bandwidthUsedMb: 0 } })

    await prisma.auditLog.create({
      data: {
        action: 'account.reset-bandwidth',
        target: account.username,
        sourceIp: request.ip,
        adminId: request.user!.role === 'admin' ? request.user!.sub : null,
      },
    })

    return reply.send({ success: true, data: { message: `Bandwidth reset for ${account.username}` } })
  })

  // PUT /api/nixserver/accounts/:id/shell
  fastify.put('/:id/shell', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { enabled } = (request.body ?? {}) as { enabled?: boolean }
    if (typeof enabled !== 'boolean') {
      return reply.code(400).send({ success: false, error: '"enabled" boolean required' })
    }

    const account = await prisma.account.findUnique({ where: { id: parseInt(id, 10) } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const shell = enabled ? '/bin/bash' : '/usr/sbin/nologin'
    await exec('usermod', ['-s', shell, account.username])
    await prisma.account.update({ where: { id: account.id }, data: { shell } })

    await prisma.auditLog.create({
      data: {
        action: enabled ? 'account.shell.enable' : 'account.shell.disable',
        target: account.username,
        sourceIp: request.ip,
        adminId: request.user!.role === 'admin' ? request.user!.sub : null,
      },
    })

    return reply.send({ success: true, data: { shell } })
  })
}
