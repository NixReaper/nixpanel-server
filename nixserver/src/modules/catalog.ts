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

export interface NixserverModuleInfo {
  id: NixserverModuleId
  label: string
  prefix: string
}

export const ALL_NIXSERVER_MODULE_IDS: NixserverModuleId[] = [
  'server-configuration',
  'accounts',
  'packages',
  'resellers',
  'dns',
  'email',
  'ssl',
  'php',
  'services',
  'system',
  'security',
  'backup',
  'webserver',
]

const MODULE_ID_SET = new Set<string>(ALL_NIXSERVER_MODULE_IDS)

export function isNixserverModuleId(value: string): value is NixserverModuleId {
  return MODULE_ID_SET.has(value)
}
