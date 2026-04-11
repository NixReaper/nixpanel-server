import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  List, Globe, GitBranch, UserX, HardDrive, BarChart2,
  Network, Plus, Mail, KeyRound, Gauge, UserCheck, FlaskConical,
  Terminal, Edit, Lock, FileQuestion, FileText, ArrowLeftRight,
  RotateCcw, Trash2, TrendingDown, ArrowUpDown, Code2, Copy, Layers
} from 'lucide-react'
import { api } from '../api/client'

interface Stats {
  total: number
  active: number
  suspended: number
  terminated: number
}

interface FunctionCard {
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  label: string
  description: string
  path: string
  soon?: boolean
}

const accountInfo: FunctionCard[] = [
  { icon: List,        label: 'List Accounts',             description: 'View and manage all hosting accounts',               path: '/accounts/list' },
  { icon: Globe,       label: 'List Parked Domains',       description: 'View all parked domains across accounts',            path: '/accounts/parked-domains' },
  { icon: GitBranch,   label: 'List Subdomains',           description: 'View all subdomains across accounts',                path: '/accounts/subdomains' },
  { icon: UserX,       label: 'List Suspended Accounts',   description: 'View and manage suspended accounts',                 path: '/accounts/suspended' },
  { icon: HardDrive,   label: 'Show Accounts Over Quota',  description: 'Accounts that have exceeded their disk quota',       path: '/accounts/over-quota' },
  { icon: BarChart2,   label: 'View Bandwidth Usage',      description: 'Bandwidth consumption sorted by usage',              path: '/accounts/bandwidth' },
]

const accountFunctions: FunctionCard[] = [
  { icon: Network,       label: 'Change Site\'s IP Address',   description: 'Assign a different IP to an account',                         path: '/accounts/change-ip' },
  { icon: Plus,          label: 'Create a New Account',        description: 'Create a new hosting account',                                 path: '/accounts/create' },
  { icon: Mail,          label: 'Email All Users',             description: 'Send a bulk email to all account holders',                     path: '/accounts/email-users',      soon: true },
  { icon: KeyRound,      label: 'Force Password Change',       description: 'Force users to change password on next login',                 path: '/accounts/force-password',    soon: true },
  { icon: Gauge,         label: 'Limit Bandwidth Usage',       description: 'Set per-account bandwidth caps independent of package',        path: '/accounts/limit-bandwidth',   soon: true },
  { icon: UserCheck,     label: 'Manage Account Suspension',   description: 'Suspend or unsuspend a hosting account',                      path: '/accounts/suspension' },
  { icon: FlaskConical,  label: 'Manage Demo Mode',            description: 'Put accounts into read-only demo mode',                       path: '/accounts/demo-mode',         soon: true },
  { icon: Terminal,      label: 'Manage Shell Access',         description: 'Grant or revoke SSH shell access',                             path: '/accounts/shell-access' },
  { icon: Edit,          label: 'Modify an Account',           description: 'Edit account email, notes, or package',                       path: '/accounts/modify' },
  { icon: Lock,          label: 'Password Modification',       description: 'Change the password for a hosting account',                   path: '/accounts/password' },
  { icon: FileQuestion,  label: 'Quota Modification',          description: 'Adjust disk and bandwidth quotas',                            path: '/accounts/quota' },
  { icon: FileText,      label: 'Apache Log Viewer',           description: 'View Apache access and error logs per account',              path: '/accounts/apache-logs' },
  { icon: ArrowLeftRight,label: 'Rearrange an Account',        description: 'Move an account between resellers',                           path: '/accounts/rearrange',         soon: true },
  { icon: RotateCcw,     label: 'Reset Account Bandwidth',     description: 'Reset bandwidth counters for accounts',                       path: '/accounts/reset-bandwidth' },
  { icon: Trash2,        label: 'Terminate Accounts',          description: 'Permanently terminate a hosting account',                     path: '/accounts/terminate' },
  { icon: TrendingDown,  label: 'Unsuspend Bandwidth Exceeders',description: 'Unsuspend accounts suspended for bandwidth',                 path: '/accounts/unsuspend-bandwidth' },
  { icon: ArrowUpDown,   label: 'Upgrade / Downgrade an Account',description: 'Change the hosting package for an account',                path: '/accounts/upgrade' },
  { icon: Code2,         label: 'Web Template Editor',         description: 'Edit default HTML templates for new accounts',                path: '/accounts/web-template',      soon: true },
]

const multiAccountFunctions: FunctionCard[] = [
  { icon: Copy,    label: 'Change Multiple Sites\' IP Addresses', description: 'Batch-change IP addresses across multiple accounts',        path: '/accounts/bulk-ip',     soon: true },
  { icon: Layers,  label: 'Modify / Upgrade Multiple Accounts',   description: 'Apply changes to multiple accounts simultaneously',         path: '/accounts/bulk-modify', soon: true },
]

interface CategoryProps {
  title: string
  color: string
  headerBg: string
  cards: FunctionCard[]
}

function Category({ title, color, headerBg, cards }: CategoryProps) {
  const navigate = useNavigate()
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
      <div className={`px-5 py-3 ${headerBg} border-b border-[#2a2d3e]`}>
        <h2 className={`text-sm font-semibold ${color}`}>{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-[#2a2d3e]">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className="relative bg-[#1a1d27] hover:bg-[#1e2130] transition-colors p-4 text-left flex items-start gap-3 group"
            >
              {card.soon && (
                <span className="absolute top-2 right-2 text-[10px] font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/25 px-1.5 py-0.5 rounded-full">
                  Soon
                </span>
              )}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                card.soon
                  ? 'bg-orange-500/10'
                  : 'bg-indigo-600/15 group-hover:bg-indigo-600/25'
              } transition-colors`}>
                <Icon size={16} className={card.soon ? 'text-orange-400' : 'text-indigo-400'} />
              </div>
              <div className="min-w-0 pr-6">
                <p className="text-white text-sm font-medium leading-tight">{card.label}</p>
                <p className="text-[#64748b] text-xs mt-0.5 leading-snug">{card.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Accounts() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get('/nixserver/accounts/stats')
      .then(r => setStats(r.data.data))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-white text-xl font-semibold">Account Functions</h1>
        <p className="text-[#64748b] text-sm">Manage hosting accounts, domains, and usage.</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Accounts', value: stats?.total ?? '—', color: 'text-white' },
          { label: 'Active',         value: stats?.active ?? '—', color: 'text-emerald-400' },
          { label: 'Suspended',      value: stats?.suspended ?? '—', color: 'text-amber-400' },
          { label: 'Terminated',     value: stats?.terminated ?? '—', color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl px-4 py-3">
            <p className="text-[#64748b] text-xs mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Categories */}
      <Category
        title="Account Information"
        color="text-indigo-400"
        headerBg="bg-indigo-600/10"
        cards={accountInfo}
      />
      <Category
        title="Account Functions"
        color="text-violet-400"
        headerBg="bg-violet-600/10"
        cards={accountFunctions}
      />
      <Category
        title="Multi Account Functions"
        color="text-emerald-400"
        headerBg="bg-emerald-600/10"
        cards={multiAccountFunctions}
      />

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-[#64748b]">
        <span className="bg-orange-500/15 text-orange-400 border border-orange-500/25 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">Soon</span>
        <span>Feature not yet implemented</span>
      </div>
    </div>
  )
}
