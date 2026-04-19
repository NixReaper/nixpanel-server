import type { FastifyInstance } from 'fastify'
import { requireAdminOrReseller } from '../../middleware/auth.js'
import { getEnabledNixserverModules, registerEnabledNixserverModules } from '../../modules/nixserver.js'

export default async function nixserverRoutes(fastify: FastifyInstance) {
  fastify.get('/modules', { preHandler: [requireAdminOrReseller] }, async (_request, reply) => {
    return reply.send({
      success: true,
      data: {
        modules: getEnabledNixserverModules().map(({ id, label, prefix }) => ({ id, label, prefix })),
      },
    })
  })

  await registerEnabledNixserverModules(fastify)
}
