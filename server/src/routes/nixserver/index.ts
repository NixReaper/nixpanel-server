import type { FastifyInstance } from 'fastify'
import accountRoutes from './accounts/index.js'
import packageRoutes from './packages.js'
import resellerRoutes from './resellers.js'
import dnsRoutes from './dns.js'
import emailRoutes from './email.js'
import sslRoutes from './ssl.js'
import phpRoutes from './php.js'
import serviceRoutes from './services.js'
import systemRoutes from './system.js'
import securityRoutes from './security.js'
import backupRoutes from './backup.js'
import webserverRoutes from './webserver.js'
import setupRoutes from './setup.js'

export default async function nixserverRoutes(fastify: FastifyInstance) {
  fastify.register(setupRoutes, { prefix: '/setup' })
  fastify.register(accountRoutes, { prefix: '/accounts' })
  fastify.register(packageRoutes, { prefix: '/packages' })
  fastify.register(resellerRoutes, { prefix: '/resellers' })
  fastify.register(dnsRoutes, { prefix: '/dns' })
  fastify.register(emailRoutes, { prefix: '/email' })
  fastify.register(sslRoutes, { prefix: '/ssl' })
  fastify.register(phpRoutes, { prefix: '/php' })
  fastify.register(serviceRoutes, { prefix: '/services' })
  fastify.register(systemRoutes, { prefix: '/system' })
  fastify.register(securityRoutes, { prefix: '/security' })
  fastify.register(backupRoutes, { prefix: '/backup' })
  fastify.register(webserverRoutes, { prefix: '/webserver' })
}
