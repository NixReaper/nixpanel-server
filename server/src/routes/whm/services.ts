import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../../middleware/auth.js'
import { exec, MANAGED_SERVICES as _ } from '../../core/exec.js'
import { getServiceStatus, MANAGED_SERVICES } from '../../core/system.js'

const ServiceActionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart', 'reload', 'enable', 'disable']),
})

export default async function serviceRoutes(fastify: FastifyInstance) {
  // GET /api/whm/services — list all managed services and their status
  fastify.get('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const statuses = await Promise.all(MANAGED_SERVICES.map(getServiceStatus))
    return reply.send({ success: true, data: statuses })
  })

  // GET /api/whm/services/:name
  fastify.get('/:name', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { name } = request.params as { name: string }
    if (!MANAGED_SERVICES.includes(name)) {
      return reply.code(400).send({ success: false, error: 'Service not in managed list' })
    }
    const status = await getServiceStatus(name)
    return reply.send({ success: true, data: status })
  })

  // POST /api/whm/services/:name — start/stop/restart/reload/enable/disable
  fastify.post('/:name', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { name } = request.params as { name: string }
    const body = ServiceActionSchema.safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }
    if (!MANAGED_SERVICES.includes(name)) {
      return reply.code(400).send({ success: false, error: 'Service not in managed list' })
    }

    const result = await exec('systemctl', [body.data.action, name])
    if (result.exitCode !== 0) {
      return reply.code(500).send({ success: false, error: result.stderr || 'Service action failed' })
    }

    const status = await getServiceStatus(name)
    return reply.send({ success: true, data: { message: `${body.data.action} ${name} succeeded`, status } })
  })
}
