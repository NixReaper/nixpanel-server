import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAuth } from '../../middleware/auth.js'
import { exec, writeFile } from '../../core/exec.js'

// Basic cron schedule validation
function isValidCronSchedule(schedule: string): boolean {
  const parts = schedule.trim().split(/\s+/)
  if (parts.length !== 5) return false
  const fieldPattern = /^(\*|(\d+(-\d+)?(,\d+(-\d+)?)*)(\/\d+)?|\*\/\d+)$/
  return parts.every(p => fieldPattern.test(p))
}

export default async function cronRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth]

  fastify.get('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : parseInt((request.query as Record<string, string>).accountId ?? '0', 10)

    const jobs = await prisma.cronJob.findMany({ where: { accountId }, orderBy: { createdAt: 'desc' } })
    return reply.send({ success: true, data: jobs })
  })

  fastify.post('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : (request.body as Record<string, number>).accountId

    const body = z.object({
      schedule: z.string().min(9),
      command: z.string().min(1).max(1000),
      comment: z.string().max(255).optional(),
      enabled: z.boolean().default(true),
    }).safeParse(request.body)

    if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    if (!isValidCronSchedule(body.data.schedule)) {
      return reply.code(400).send({ success: false, error: 'Invalid cron schedule' })
    }

    const account = await prisma.account.findUnique({ where: { id: accountId }, include: { package: true } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    // Check quota
    if (account.package && account.package.maxCronJobs > 0) {
      const count = await prisma.cronJob.count({ where: { accountId } })
      if (count >= account.package.maxCronJobs) {
        return reply.code(429).send({ success: false, error: 'Cron job limit reached' })
      }
    }

    const job = await prisma.cronJob.create({
      data: { ...body.data, accountId },
    })

    await writeCrontab(account.username, accountId)

    return reply.code(201).send({ success: true, data: job })
  })

  fastify.put('/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const body = z.object({
      schedule: z.string().optional(),
      command: z.string().min(1).max(1000).optional(),
      comment: z.string().max(255).optional(),
      enabled: z.boolean().optional(),
    }).safeParse(request.body)

    if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    if (body.data.schedule && !isValidCronSchedule(body.data.schedule)) {
      return reply.code(400).send({ success: false, error: 'Invalid cron schedule' })
    }

    const job = await prisma.cronJob.findFirst({
      where: { id: parseInt(id, 10), ...(user.role === 'user' ? { accountId: user.sub } : {}) },
      include: { account: true },
    })
    if (!job) return reply.code(404).send({ success: false, error: 'Cron job not found' })

    const updated = await prisma.cronJob.update({
      where: { id: job.id },
      data: body.data,
    })

    await writeCrontab(job.account.username, job.accountId)

    return reply.send({ success: true, data: updated })
  })

  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const job = await prisma.cronJob.findFirst({
      where: { id: parseInt(id, 10), ...(user.role === 'user' ? { accountId: user.sub } : {}) },
      include: { account: true },
    })
    if (!job) return reply.code(404).send({ success: false, error: 'Cron job not found' })

    await prisma.cronJob.delete({ where: { id: job.id } })
    await writeCrontab(job.account.username, job.accountId)

    return reply.send({ success: true, data: { message: 'Cron job deleted' } })
  })
}

/**
 * Regenerate and install the crontab for a user.
 */
async function writeCrontab(username: string, accountId: number): Promise<void> {
  const jobs = await prisma.cronJob.findMany({
    where: { accountId, enabled: true },
    orderBy: { createdAt: 'asc' },
  })

  const lines = [
    `# NixPanel crontab for ${username}`,
    `# DO NOT EDIT — managed by NixPanel`,
    '',
    ...jobs.map(j => `${j.schedule} ${j.command}${j.comment ? ` # ${j.comment}` : ''}`),
    '',
  ]

  const crontabPath = `/var/spool/cron/crontabs/${username}`
  await writeFile(crontabPath, lines.join('\n'))
  await exec('chown', [`${username}:crontab`, crontabPath])
  await exec('chmod', ['600', crontabPath])
}
