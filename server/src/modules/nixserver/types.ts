import type { FastifyPluginAsync } from 'fastify'

export type NixserverModuleId =
  | 'server-configuration'
  | 'accounts'
  | 'packages'
  | 'resellers'
  | 'dns'
  | 'email'
  | 'ssl'
  | 'php'
  | 'services'
  | 'system'
  | 'security'
  | 'backup'
  | 'webserver'

export interface NixserverModule {
  id: NixserverModuleId
  label: string
  prefix: string
  register: FastifyPluginAsync
}
