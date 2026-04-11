import type { FastifyInstance } from 'fastify'
import listRoutes    from './list.js'
import createRoute   from './create.js'
import modifyRoutes  from './modify.js'
import statusRoutes  from './status.js'

export default async function accountRoutes(fastify: FastifyInstance) {
  fastify.register(listRoutes)
  fastify.register(createRoute)
  fastify.register(modifyRoutes)
  fastify.register(statusRoutes)
}
