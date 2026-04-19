import React from 'react'
import { Users, UserCheck, ArrowRightLeft } from 'lucide-react'
import Accounts from '../pages/Accounts'
import CreateAccount from '../pages/CreateAccount'
import type { NixserverFrontendModule } from './types'
import type { NavCategory } from '../components/navData'

const AccountList = React.lazy(() => import('../pages/accounts/List'))
const AccountParkedDomains = React.lazy(() => import('../pages/accounts/ParkedDomains'))
const AccountSubdomains = React.lazy(() => import('../pages/accounts/Subdomains'))
const AccountSuspended = React.lazy(() => import('../pages/accounts/Suspended'))
const AccountOverQuota = React.lazy(() => import('../pages/accounts/OverQuota'))
const AccountBandwidth = React.lazy(() => import('../pages/accounts/Bandwidth'))
const AccountChangeIP = React.lazy(() => import('../pages/accounts/ChangeIP'))
const AccountEmailUsers = React.lazy(() => import('../pages/accounts/EmailUsers'))
const AccountForcePassword = React.lazy(() => import('../pages/accounts/ForcePassword'))
const AccountLimitBandwidth = React.lazy(() => import('../pages/accounts/LimitBandwidth'))
const AccountSuspension = React.lazy(() => import('../pages/accounts/Suspension'))
const AccountDemoMode = React.lazy(() => import('../pages/accounts/DemoMode'))
const AccountShellAccess = React.lazy(() => import('../pages/accounts/ShellAccess'))
const AccountModify = React.lazy(() => import('../pages/accounts/Modify'))
const AccountPasswordMod = React.lazy(() => import('../pages/accounts/PasswordMod'))
const AccountQuotaMod = React.lazy(() => import('../pages/accounts/QuotaMod'))
const AccountApacheLogs = React.lazy(() => import('../pages/accounts/ApacheLogs'))
const AccountNginxLogs = React.lazy(() => import('../pages/accounts/NginxLogs'))
const AccountRearrange = React.lazy(() => import('../pages/accounts/Rearrange'))
const AccountResetBandwidth = React.lazy(() => import('../pages/accounts/ResetBandwidth'))
const AccountTerminate = React.lazy(() => import('../pages/accounts/Terminate'))
const AccountUnsuspendBW = React.lazy(() => import('../pages/accounts/UnsuspendBandwidth'))
const AccountUpgrade = React.lazy(() => import('../pages/accounts/Upgrade'))
const AccountWebTemplate = React.lazy(() => import('../pages/accounts/WebTemplate'))
const AccountBulkIP = React.lazy(() => import('../pages/accounts/BulkIP'))
const AccountBulkModify = React.lazy(() => import('../pages/accounts/BulkModify'))

function withLoader(node: React.ReactNode) {
  return (
    <React.Suspense fallback={<PageLoader />}>
      {node}
    </React.Suspense>
  )
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export const accountsNavCategories: NavCategory[] = [
  {
    id: 'account-info',
    label: 'Account Information',
    icon: Users,
    items: [
      { label: 'List Accounts', to: '/accounts/list', moduleId: 'accounts' },
      { label: 'List Parked Domains', to: '/accounts/parked-domains', moduleId: 'accounts' },
      { label: 'List Subdomains', to: '/accounts/subdomains', moduleId: 'accounts' },
      { label: 'List Suspended Accounts', to: '/accounts/suspended', moduleId: 'accounts' },
      { label: 'Show Accounts Over Quota', to: '/accounts/over-quota', moduleId: 'accounts' },
      { label: 'View Bandwidth Usage', to: '/accounts/bandwidth', moduleId: 'accounts' },
    ],
  },
  {
    id: 'account-functions',
    label: 'Account Functions',
    icon: UserCheck,
    items: [
      { label: "Change Site's IP Address", to: '/accounts/change-ip', moduleId: 'accounts' },
      { label: 'Create a New Account', to: '/accounts/create', moduleId: 'accounts' },
      { label: 'Email All Users', to: '/accounts/email-users', moduleId: 'accounts' },
      { label: 'Force Password Change', to: '/accounts/force-password', moduleId: 'accounts' },
      { label: 'Limit Bandwidth Usage', to: '/accounts/limit-bandwidth', moduleId: 'accounts' },
      { label: 'Manage Account Suspension', to: '/accounts/suspension', moduleId: 'accounts' },
      { label: 'Manage Demo Mode', to: '/accounts/demo-mode', moduleId: 'accounts' },
      { label: 'Manage Shell Access', to: '/accounts/shell-access', moduleId: 'accounts' },
      { label: 'Modify an Account', to: '/accounts/modify', moduleId: 'accounts' },
      { label: 'Password Modification', to: '/accounts/password', moduleId: 'accounts' },
      { label: 'Quota Modification', to: '/accounts/quota', moduleId: 'accounts' },
      { label: 'Raw Apache Log Download', to: '/accounts/apache-logs', moduleId: 'accounts' },
      { label: 'Raw NGINX Log Download', to: '/accounts/nginx-logs', moduleId: 'accounts' },
      { label: 'Rearrange an Account', to: '/accounts/rearrange', moduleId: 'accounts' },
      { label: 'Reset Account Bandwidth', to: '/accounts/reset-bandwidth', moduleId: 'accounts' },
      { label: 'Terminate Accounts', to: '/accounts/terminate', moduleId: 'accounts' },
      { label: 'Unsuspend Bandwidth Exceeders', to: '/accounts/unsuspend-bandwidth', moduleId: 'accounts' },
      { label: 'Upgrade/Downgrade an Account', to: '/accounts/upgrade', moduleId: 'accounts' },
      { label: 'Web Template Editor', to: '/accounts/web-template', moduleId: 'accounts' },
    ],
  },
  {
    id: 'multi-account',
    label: 'Multi Account Functions',
    icon: ArrowRightLeft,
    items: [
      { label: "Change Multiple Sites' IP Addresses", to: '/accounts/bulk-ip', moduleId: 'accounts' },
      { label: 'Modify/Upgrade Multiple Accounts', to: '/accounts/bulk-modify', moduleId: 'accounts' },
    ],
  },
]

export const accountsModule: NixserverFrontendModule = {
  id: 'accounts',
  navCategories: accountsNavCategories,
  routes: [
    { path: 'accounts', element: <Accounts /> },
    { path: 'accounts/create', element: <CreateAccount /> },
    { path: 'accounts/list', element: withLoader(<AccountList />) },
    { path: 'accounts/parked-domains', element: withLoader(<AccountParkedDomains />) },
    { path: 'accounts/subdomains', element: withLoader(<AccountSubdomains />) },
    { path: 'accounts/suspended', element: withLoader(<AccountSuspended />) },
    { path: 'accounts/over-quota', element: withLoader(<AccountOverQuota />) },
    { path: 'accounts/bandwidth', element: withLoader(<AccountBandwidth />) },
    { path: 'accounts/change-ip', element: withLoader(<AccountChangeIP />) },
    { path: 'accounts/email-users', element: withLoader(<AccountEmailUsers />) },
    { path: 'accounts/force-password', element: withLoader(<AccountForcePassword />) },
    { path: 'accounts/limit-bandwidth', element: withLoader(<AccountLimitBandwidth />) },
    { path: 'accounts/suspension', element: withLoader(<AccountSuspension />) },
    { path: 'accounts/demo-mode', element: withLoader(<AccountDemoMode />) },
    { path: 'accounts/shell-access', element: withLoader(<AccountShellAccess />) },
    { path: 'accounts/modify', element: withLoader(<AccountModify />) },
    { path: 'accounts/password', element: withLoader(<AccountPasswordMod />) },
    { path: 'accounts/quota', element: withLoader(<AccountQuotaMod />) },
    { path: 'accounts/apache-logs', element: withLoader(<AccountApacheLogs />) },
    { path: 'accounts/nginx-logs', element: withLoader(<AccountNginxLogs />) },
    { path: 'accounts/rearrange', element: withLoader(<AccountRearrange />) },
    { path: 'accounts/reset-bandwidth', element: withLoader(<AccountResetBandwidth />) },
    { path: 'accounts/terminate', element: withLoader(<AccountTerminate />) },
    { path: 'accounts/unsuspend-bandwidth', element: withLoader(<AccountUnsuspendBW />) },
    { path: 'accounts/upgrade', element: withLoader(<AccountUpgrade />) },
    { path: 'accounts/web-template', element: withLoader(<AccountWebTemplate />) },
    { path: 'accounts/bulk-ip', element: withLoader(<AccountBulkIP />) },
    { path: 'accounts/bulk-modify', element: withLoader(<AccountBulkModify />) },
  ],
}
