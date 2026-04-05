import type { FastifyInstance } from 'fastify'
import fileRoutes from './files.js'
import databaseRoutes from './databases.js'
import emailRoutes from './email.js'
import domainRoutes from './domains.js'
import ftpRoutes from './ftp.js'
import cronRoutes from './cron.js'
import statsRoutes from './stats.js'

export default async function nixclientRoutes(fastify: FastifyInstance) {
  fastify.register(fileRoutes, { prefix: '/files' })
  fastify.register(databaseRoutes, { prefix: '/databases' })
  fastify.register(emailRoutes, { prefix: '/email' })
  fastify.register(domainRoutes, { prefix: '/domains' })
  fastify.register(ftpRoutes, { prefix: '/ftp' })
  fastify.register(cronRoutes, { prefix: '/cron' })
  fastify.register(statsRoutes, { prefix: '/stats' })
}
