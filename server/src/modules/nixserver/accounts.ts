import accountRoutes from '../../routes/nixserver/accounts/index.js'
import type { NixserverModule } from './types.js'

export const accountsModule: NixserverModule = {
  id: 'accounts',
  label: 'Accounts',
  prefix: '/accounts',
  register: accountRoutes,
}
