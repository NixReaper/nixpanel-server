import {
  Settings, Lock, BarChart2, Clock, HardDrive, Link2,
  User, Timer, PieChart, Terminal, Sliders, RefreshCw, ShoppingBag,
} from 'lucide-react'
import SectionCard from '../../components/SectionCard'

const TOOLS = [
  {
    label: 'Basic NixServer Setup',
    description: 'Configure contact info, shared IP, nameservers, DNS TTL, home directory, and Apache log style.',
    to: '/server-configuration/basic-setup',
    icon: Settings,
    comingSoon: false,
  },
  {
    label: 'Change Root Password',
    description: 'Update the root account password for this server.',
    to: '/server-configuration/change-root',
    icon: Lock,
    comingSoon: false,
  },
  {
    label: 'Configure Analytics',
    description: 'Enable and configure server-side analytics and statistics collection.',
    to: '/server-configuration/analytics',
    icon: BarChart2,
    comingSoon: true,
  },
  {
    label: 'Configure Cron Jobs',
    description: 'Schedule recurring system-level tasks and maintenance scripts.',
    to: '/server-configuration/cron-jobs',
    icon: Clock,
    comingSoon: true,
  },
  {
    label: 'Initial Quota Setup',
    description: 'Configure disk quota enforcement and default account limits.',
    to: '/server-configuration/quota-setup',
    icon: HardDrive,
    comingSoon: true,
  },
  {
    label: 'Link Server Nodes',
    description: 'Connect additional server nodes for clustering or load distribution.',
    to: '/server-configuration/link-nodes',
    icon: Link2,
    comingSoon: true,
  },
  {
    label: 'Server Profile',
    description: 'Set server-wide identity, locale, and branding preferences.',
    to: '/server-configuration/server-profile',
    icon: User,
    comingSoon: true,
  },
  {
    label: 'Server Time',
    description: 'Configure the system clock, timezone, and NTP synchronization.',
    to: '/server-configuration/server-time',
    icon: Timer,
    comingSoon: true,
  },
  {
    label: 'Statistics Software',
    description: 'Install and configure AWStats, Webalizer, or other log analysis tools.',
    to: '/server-configuration/statistics-software',
    icon: PieChart,
    comingSoon: true,
  },
  {
    label: 'Terminal',
    description: 'Open a browser-based terminal session with server access.',
    to: '/server-configuration/terminal',
    icon: Terminal,
    comingSoon: true,
  },
  {
    label: 'Tweak Settings',
    description: 'Fine-tune advanced server behaviours and feature toggles.',
    to: '/server-configuration/tweak-settings',
    icon: Sliders,
    comingSoon: true,
  },
  {
    label: 'Update Preferences',
    description: 'Control automatic update behaviour, channels, and scheduling.',
    to: '/server-configuration/update-preferences',
    icon: RefreshCw,
    comingSoon: true,
  },
  {
    label: 'NixServer Marketplace',
    description: 'Browse and install official extensions, plugins, and integrations.',
    to: '/server-configuration/marketplace',
    icon: ShoppingBag,
    comingSoon: true,
  },
]

export default function ServerConfiguration() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-xl font-semibold">Server Configuration</h1>
        <p className="text-[#64748b] text-sm mt-0.5">Server-wide settings and system configuration tools</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {TOOLS.map(tool => (
          <SectionCard key={tool.to} {...tool} />
        ))}
      </div>
    </div>
  )
}
