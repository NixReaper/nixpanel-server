import type { ReactNode } from 'react'
import type { NavCategory } from '../components/navData'
import type { NixserverModuleId } from './catalog'

export interface ModuleRouteDefinition {
  path: string
  element: ReactNode
}

export interface NixserverFrontendModule {
  id: NixserverModuleId
  navCategories?: NavCategory[]
  routes?: ModuleRouteDefinition[]
}
