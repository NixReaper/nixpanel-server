import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '../../db/client.js'
import { requireAdmin } from '../../middleware/auth.js'
import { exec } from '../../core/exec.js'

const SetupSchema = z.object({
  hostname: z.string().min(1).max(253),
  nameserver1: z.string().min(1).max(253),
  nameserver2: z.string().min(1).max(253),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
  if (data.adminPassword && data.adminPassword !== data.confirmPassword) return false
  return true
}, { message: 'Passwords do not match', path: ['confirmPassword'] })

export default async function setupRoutes(fastify: FastifyInstance) {
  // GET /api/nixserver/setup/status — check if first-run setup has been completed
  fastify.get('/status', { preHandler: [requireAdmin] }, async (_request, reply) => {
    const setting = await prisma.setting.findUnique({ where: { key: 'setup_complete' } })
    return reply.send({ success: true, data: { setupComplete: setting?.value === 'true' } })
  })

  // POST /api/nixserver/setup/complete — save setup values and mark as done
  fastify.post('/complete', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = SetupSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const { hostname, nameserver1, nameserver2, adminEmail, adminPassword } = body.data
    const user = request.user!

    // Persist settings
    const settings = [
      { key: 'hostname',        value: hostname },
      { key: 'nameserver1',     value: nameserver1 },
      { key: 'nameserver2',     value: nameserver2 },
      { key: 'setup_complete',  value: 'true' },
    ]

    for (const { key, value } of settings) {
      await prisma.setting.upsert({
        where:  { key },
        update: { value },
        create: { key, value },
      })
    }

    // Update admin email
    await prisma.adminUser.update({
      where: { id: user.sub },
      data:  { email: adminEmail },
    })

    // Update admin password if provided
    if (adminPassword) {
      const hash = await bcrypt.hash(adminPassword, 12)
      await prisma.adminUser.update({
        where: { id: user.sub },
        data:  { passwordHash: hash },
      })
    }

    // Apply hostname to the system (non-fatal if it fails)
    await exec('hostnamectl', ['set-hostname', hostname]).catch(() => {})

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: user.sub,
        action: 'setup.complete',
        target: 'system',
        details: `First-run setup completed. Hostname: ${hostname}`,
      },
    }).catch(() => {})

    return reply.send({ success: true, data: { message: 'Setup complete' } })
  })
}
