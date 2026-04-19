import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import packageRoutes from '../routes/nixserver/packages.js'
import resellerRoutes from '../routes/nixserver/resellers.js'
import dnsRoutes from '../routes/nixserver/dns.js'
import emailRoutes from '../routes/nixserver/email.js'
import sslRoutes from '../routes/nixserver/ssl.js'
import phpRoutes from '../routes/nixserver/php.js'
import serviceRoutes from '../routes/nixserver/services.js'
import systemRoutes from '../routes/nixserver/system.js'
import securityRoutes from '../routes/nixserver/security.js'
import backupRoutes from '../routes/nixserver/backup.js'
import webserverRoutes from '../routes/nixserver/webserver.js'
import setupRoutes from '../routes/nixserver/setup.js'
import { config } from '../config.js'
import { accountsModule } from './nixserver/accounts.js'
import type { NixserverModule, NixserverModuleId } from './nixserver/types.js'

export const NIXSERVER_MODULES: NixserverModule[] = [
  { id: 'server-configuration', label: 'Server Configuration', prefix: '/setup', register: setupRoutes },
  accountsModule,
  { id: 'packages', label: 'Packages', prefix: '/packages', register: packageRoutes },
  { id: 'resellers', label: 'Resellers', prefix: '/resellers', register: resellerRoutes },
  { id: 'dns', label: 'DNS', prefix: '/dns', register: dnsRoutes },
  { id: 'email', label: 'Email', prefix: '/email', register: emailRoutes },
  { id: 'ssl', label: 'SSL', prefix: '/ssl', register: sslRoutes },
  { id: 'php', label: 'PHP', prefix: '/php', register: phpRoutes },
  { id: 'services', label: 'Services', prefix: '/services', register: serviceRoutes },
  { id: 'system', label: 'System', prefix: '/system', register: systemRoutes },
  { id: 'security', label: 'Security', prefix: '/security', register: securityRoutes },
  { id: 'backup', label: 'Backup', prefix: '/backup', register: backupRoutes },
  { id: 'webserver', label: 'Web Server', prefix: '/webserver', register: webserverRoutes },
]

export function getEnabledNixserverModules(): NixserverModule[] {
  const enabled = config.modules.nixserver

  if (enabled.includes('all')) {
    return NIXSERVER_MODULES
  }

  const enabledSet = new Set(enabled)
  return NIXSERVER_MODULES.filter(module => enabledSet.has(module.id))
}

export async function registerEnabledNixserverModules(fastify: FastifyInstance): Promise<void> {
  for (const module of getEnabledNixserverModules()) {
    await fastify.register(module.register, { prefix: module.prefix })
  }
}
