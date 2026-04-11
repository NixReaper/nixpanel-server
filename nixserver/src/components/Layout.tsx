import { useState, useMemo, useEffect, useCallback } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Settings, HelpCircle, Network, BookUser, UserCog,
  Wrench, Languages, HardDrive, GitFork, RefreshCw, Activity,
  Users, UserCheck, ArrowRightLeft, Paintbrush, Package,
  Globe, Database, Wifi, Box, Mail, HeartPulse, Lock,
  ShoppingBag, Code2, Puzzle, LogOut, Menu, X,
  ChevronDown, ChevronRight, Search, RotateCcw, RefreshCcw,
  ArrowUpCircle, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

// ─── Nav data ────────────────────────────────────────────────────────────────

type NavItem = { label: string; to: string }
type NavCategory = {
  id: string
  label: string
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  items: NavItem[]
}

const NAV: NavCategory[] = [
  {
    id: 'server-config',
    label: 'Server Configuration',
    icon: Settings,
    items: [
      { label: 'Basic WebHost Manager® Setup',    to: '/settings' },
      { label: 'Change Root Password',             to: '/security' },
      { label: 'Configure Analytics',              to: '/settings' },
      { label: 'Configure Cron Jobs',              to: '/settings' },
      { label: 'Initial Quota Setup',              to: '/settings' },
      { label: 'Link Server Nodes',                to: '/settings' },
      { label: 'Server Profile',                   to: '/settings' },
      { label: 'Server Time',                      to: '/system'   },
      { label: 'Statistics Software',              to: '/settings' },
      { label: 'Terminal',                         to: '/system'   },
      { label: 'Tweak Settings',                   to: '/settings' },
      { label: 'Update Preferences',               to: '/settings' },
      { label: 'WHM Marketplace',                  to: '/settings' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    icon: HelpCircle,
    items: [
      { label: 'Grant NixPanel Support Access', to: '/security' },
      { label: 'Support Center',                to: '/settings' },
    ],
  },
  {
    id: 'networking',
    label: 'Networking Setup',
    icon: Network,
    items: [
      { label: 'Change Hostname',                  to: '/security' },
      { label: 'Resolver Configuration',           to: '/security' },
      { label: 'Security Center',                  to: '/security' },
      { label: 'Apache mod_userdir Tweak',         to: '/webserver' },
      { label: 'SMTP Restrictions',                to: '/email'    },
      { label: 'Compiler Access',                  to: '/security' },
      { label: 'Configure Security Policies',      to: '/security' },
      { label: 'mXSTOP Brute Force Protection',    to: '/security' },
      { label: 'Host Access Control',              to: '/security' },
      { label: 'Manage External Authentications',  to: '/security' },
      { label: "Manage root's SSH Keys",           to: '/security' },
      { label: 'Manage Wheel Group Users',         to: '/security' },
      { label: 'ModSecurity™ Configuration',       to: '/security' },
      { label: 'ModSecurity™ Tools',               to: '/security' },
      { label: 'ModSecurity™ Vendors',             to: '/security' },
      { label: 'Password Strength Configuration',  to: '/security' },
      { label: 'Security Advisor',                 to: '/security' },
      { label: 'Security Questions',               to: '/security' },
      { label: 'Shell Fork Bomb Protection',       to: '/security' },
      { label: 'SSH Password Authorization Tweak', to: '/security' },
      { label: 'Traceroute Enable/Disable',        to: '/security' },
      { label: 'Two-Factor Authentication',        to: '/security' },
    ],
  },
  {
    id: 'contacts',
    label: 'Server Contacts',
    icon: BookUser,
    items: [
      { label: 'Contact Manager',              to: '/settings' },
      { label: 'Edit System Mail Preferences', to: '/email'    },
    ],
  },
  {
    id: 'resellers',
    label: 'Resellers',
    icon: UserCog,
    items: [
      { label: 'Change Ownership of an Account',           to: '/resellers' },
      { label: 'Change Ownership of Multiple Accounts',    to: '/resellers' },
      { label: 'Edit Reseller Nameservers and Privileges', to: '/resellers' },
      { label: 'Email All Resellers',                      to: '/resellers' },
      { label: "Manage Reseller's IP Delegation",          to: '/resellers' },
      { label: "Manage Reseller's Shared IP",              to: '/resellers' },
      { label: 'Reseller Center',                          to: '/resellers' },
      { label: 'Reset Resellers',                          to: '/resellers' },
      { label: 'Show Reseller Accounts',                   to: '/resellers' },
      { label: 'View Reseller Usage',                      to: '/resellers' },
    ],
  },
  {
    id: 'service-config',
    label: 'Service Configuration',
    icon: Wrench,
    items: [
      { label: 'Apache Configuration',              to: '/webserver' },
      { label: 'Log Rotation Configuration',        to: '/settings'  },
      { label: 'Web Disk Configuration',            to: '/settings'  },
      { label: 'Web Services Configuration',        to: '/settings'  },
      { label: 'Exim Configuration Manager',        to: '/email'     },
      { label: 'FTP Server Selection',              to: '/settings'  },
      { label: 'Mailserver Configuration',          to: '/email'     },
      { label: 'Manage Service SSL Certificates',   to: '/ssl'       },
      { label: 'Nameserver Selection',              to: '/dns'       },
      { label: 'Service Manager',                   to: '/services'  },
    ],
  },
  {
    id: 'locales',
    label: 'Locales',
    icon: Languages,
    items: [
      { label: 'Configure Application Locales', to: '/settings' },
      { label: 'Copy a Locale',                 to: '/settings' },
      { label: 'Delete a Locale',               to: '/settings' },
      { label: 'Edit a Locale',                 to: '/settings' },
      { label: 'Locale XML Download',           to: '/settings' },
      { label: 'Locale XML Upload',             to: '/settings' },
      { label: 'View Available Locales',        to: '/settings' },
    ],
  },
  {
    id: 'backup',
    label: 'Backup',
    icon: HardDrive,
    items: [
      { label: 'Backup Configuration',        to: '/backup' },
      { label: 'Backup Restoration',          to: '/backup' },
      { label: 'Backup User Selection',       to: '/backup' },
      { label: 'File and Directory Restoration', to: '/backup' },
    ],
  },
  {
    id: 'clusters',
    label: 'Clusters',
    icon: GitFork,
    items: [
      { label: 'Configuration Cluster', to: '/settings' },
      { label: 'DNS Cluster',           to: '/dns'      },
      { label: 'Remote Access Key',     to: '/security' },
    ],
  },
  {
    id: 'reboot',
    label: 'System Reboot',
    icon: RotateCcw,
    items: [
      { label: 'Forceful Server Reboot', to: '/system' },
      { label: 'Graceful Server Reboot', to: '/system' },
    ],
  },
  {
    id: 'server-status',
    label: 'Server Status',
    icon: Activity,
    items: [
      { label: 'Apache Status',     to: '/webserver' },
      { label: 'Daily Process Log', to: '/system'    },
      { label: 'Server Information',to: '/system'    },
      { label: 'Service Status',    to: '/services'  },
      { label: 'Task Queue Monitor',to: '/system'    },
    ],
  },
  {
    id: 'account-info',
    label: 'Account Information',
    icon: Users,
    items: [
      { label: 'List Accounts',            to: '/accounts/list'          },
      { label: 'List Parked Domains',      to: '/accounts/parked-domains'},
      { label: 'List Subdomains',          to: '/accounts/subdomains'    },
      { label: 'List Suspended Accounts',  to: '/accounts/suspended'     },
      { label: 'Show Accounts Over Quota', to: '/accounts/over-quota'    },
      { label: 'View Bandwidth Usage',     to: '/accounts/bandwidth'     },
    ],
  },
  {
    id: 'account-functions',
    label: 'Account Functions',
    icon: UserCheck,
    items: [
      { label: "Change Site's IP Address",   to: '/accounts/change-ip'          },
      { label: 'Create a New Account',       to: '/accounts/create'             },
      { label: 'Email All Users',            to: '/accounts/email-users'        },
      { label: 'Force Password Change',      to: '/accounts/force-password'     },
      { label: 'Limit Bandwidth Usage',      to: '/accounts/limit-bandwidth'    },
      { label: 'Manage Account Suspension',  to: '/accounts/suspension'         },
      { label: 'Manage Demo Mode',           to: '/accounts/demo-mode'          },
      { label: 'Manage Shell Access',        to: '/accounts/shell-access'       },
      { label: 'Modify an Account',          to: '/accounts/modify'             },
      { label: 'Password Modification',      to: '/accounts/password'           },
      { label: 'Quota Modification',         to: '/accounts/quota'              },
      { label: 'Raw Apache Log Download',    to: '/accounts/apache-logs'        },
      { label: 'Raw NGINX® Log Download',    to: '/accounts/nginx-logs'         },
      { label: 'Rearrange an Account',       to: '/accounts/rearrange'          },
      { label: 'Reset Account Bandwidth',    to: '/accounts/reset-bandwidth'    },
      { label: 'Terminate Accounts',         to: '/accounts/terminate'          },
      { label: 'Unsuspend Bandwidth Exceeders', to: '/accounts/unsuspend-bandwidth' },
      { label: 'Upgrade/Downgrade an Account', to: '/accounts/upgrade'          },
      { label: 'Web Template Editor',        to: '/accounts/web-template'       },
    ],
  },
  {
    id: 'multi-account',
    label: 'Multi Account Functions',
    icon: Users,
    items: [
      { label: "Change Multiple Sites' IP Addresses", to: '/accounts/bulk-ip'     },
      { label: 'Modify/Upgrade Multiple Accounts',    to: '/accounts/bulk-modify' },
    ],
  },
  {
    id: 'transfers',
    label: 'Transfers',
    icon: ArrowRightLeft,
    items: [
      { label: 'Convert Addon Domain to Account',      to: '/accounts' },
      { label: 'Review Transfers and Restores',         to: '/accounts' },
      { label: 'Transfer or Restore a cPanel Account', to: '/accounts' },
      { label: 'Transfer Tool',                         to: '/accounts' },
    ],
  },
  {
    id: 'themes',
    label: 'Themes',
    icon: Paintbrush,
    items: [
      { label: 'Theme Manager', to: '/settings' },
    ],
  },
  {
    id: 'packages',
    label: 'Packages',
    icon: Package,
    items: [
      { label: 'Add a Package',    to: '/packages' },
      { label: 'Delete a Package', to: '/packages' },
      { label: 'Edit a Package',   to: '/packages' },
      { label: 'Feature Manager',  to: '/packages' },
    ],
  },
  {
    id: 'dns',
    label: 'DNS Functions',
    icon: Globe,
    items: [
      { label: 'Add a DNS Zone',              to: '/dns'   },
      { label: 'Add an A Entry for Hostname', to: '/dns'   },
      { label: 'Delete a DNS Zone',           to: '/dns'   },
      { label: 'DNS Zone Manager',            to: '/dns'   },
      { label: 'Edit Zone Templates',         to: '/dns'   },
      { label: 'Email DNS Record Manager',    to: '/dns'   },
      { label: 'Email Routing Configuration', to: '/email' },
      { label: 'Enable DKIM/SPF Globally',    to: '/email' },
      { label: 'Nameserver Record Report',    to: '/dns'   },
      { label: 'Park a Domain',               to: '/dns'   },
      { label: 'Perform a DNS Cleanup',       to: '/dns'   },
      { label: 'Set Zone TTL',                to: '/dns'   },
      { label: 'Setup/Edit Domain Forwarding',to: '/dns'   },
      { label: 'Synchronize DNS Records',     to: '/dns'   },
    ],
  },
  {
    id: 'databases',
    label: 'Database Services',
    icon: Database,
    items: [
      { label: 'Change Database Root Password',  to: '/settings' },
      { label: 'Change Database User Password',  to: '/settings' },
      { label: 'Database Map Tool',              to: '/settings' },
      { label: 'Edit Database Configuration',    to: '/settings' },
      { label: 'Manage Database Access Hosts',   to: '/settings' },
      { label: 'Manage Database Profiles',       to: '/settings' },
      { label: 'Manage Database Users',          to: '/settings' },
      { label: 'Manage Databases',               to: '/settings' },
      { label: 'phpMyAdmin',                     to: '/settings' },
      { label: 'Repair Databases',               to: '/settings' },
      { label: 'Show Database Processes',        to: '/settings' },
      { label: 'Upgrade Database Version',       to: '/settings' },
    ],
  },
  {
    id: 'ip',
    label: 'IP Functions',
    icon: Wifi,
    items: [
      { label: 'IPv6 Ranges',                    to: '/security' },
      { label: 'Add a New IP Address',           to: '/security' },
      { label: 'Assign IPv6 Address',            to: '/security' },
      { label: 'Configure Remote Service IPs',   to: '/security' },
      { label: 'IP Migration Wizard',            to: '/security' },
      { label: 'Rebuild the IP Address Pool',    to: '/security' },
      { label: 'Show IP Address Usage',          to: '/security' },
      { label: 'Show or Delete Current IPs',     to: '/security' },
      { label: 'Show/Edit Reserved IPs',         to: '/security' },
    ],
  },
  {
    id: 'software',
    label: 'Software',
    icon: Box,
    items: [
      { label: 'Install a Perl Module',   to: '/system'    },
      { label: 'Install Distro Packages', to: '/system'    },
      { label: 'Module Installers',       to: '/system'    },
      { label: 'MultiPHP INI Editor',     to: '/php'       },
      { label: 'MultiPHP Manager',        to: '/php'       },
      { label: 'NGINX® Manager',          to: '/webserver' },
      { label: 'Rebuild RPM Database',    to: '/system'    },
      { label: 'System Update',           to: '/system'    },
      { label: 'Update Server Software',  to: '/system'    },
      { label: 'EasyApache 4',            to: '/webserver' },
    ],
  },
  {
    id: 'email',
    label: 'Email',
    icon: Mail,
    items: [
      { label: 'Email Deliverability',              to: '/email' },
      { label: 'Filter Incoming Emails by Country', to: '/email' },
      { label: 'Filter Incoming Emails by Domain',  to: '/email' },
      { label: 'Greylisting',                       to: '/email' },
      { label: 'Mail Delivery Reports',             to: '/email' },
      { label: 'Mail Queue Manager',                to: '/email' },
      { label: 'Mail Troubleshooter',               to: '/email' },
      { label: 'Mailbox Conversion',                to: '/email' },
      { label: 'Repair Mailbox Permissions',        to: '/email' },
      { label: 'Spamd Startup Configuration',       to: '/email' },
      { label: 'View Mail Statistics Summary',      to: '/email' },
      { label: 'View Relayers',                     to: '/email' },
      { label: 'View Sent Summary',                 to: '/email' },
    ],
  },
  {
    id: 'system-health',
    label: 'System Health',
    icon: HeartPulse,
    items: [
      { label: 'Background Process Killer',    to: '/system' },
      { label: 'Process Manager',              to: '/system' },
      { label: 'Show Current Disk Usage',      to: '/system' },
      { label: 'Show Current Running Processes', to: '/system' },
    ],
  },
  {
    id: 'nixpanel',
    label: 'NixPanel',
    icon: LayoutDashboard,
    items: [
      { label: 'Change Log',             to: '/settings' },
      { label: 'Customization',          to: '/settings' },
      { label: 'Manage Plugins',         to: '/settings' },
      { label: 'Modify NixPanel News',   to: '/settings' },
      { label: 'Reset a Mailman Password', to: '/email'  },
      { label: 'Upgrade to Latest Version', to: '/settings' },
    ],
  },
  {
    id: 'ssl',
    label: 'SSL/TLS',
    icon: Lock,
    items: [
      { label: 'Generate an SSL Certificate and Signing Request', to: '/ssl' },
      { label: 'Install an SSL Certificate on a Domain',          to: '/ssl' },
      { label: 'Manage AutoSSL',                                  to: '/ssl' },
      { label: 'Manage SSL Hosts',                                to: '/ssl' },
      { label: 'Purchase and Install an SSL Certificate',         to: '/ssl' },
      { label: 'SSL Storage Manager',                             to: '/ssl' },
      { label: 'SSL/TLS Configuration',                           to: '/ssl' },
    ],
  },
  {
    id: 'market',
    label: 'Market',
    icon: ShoppingBag,
    items: [
      { label: 'Market Provider Manager', to: '/settings' },
    ],
  },
  {
    id: 'restart-services',
    label: 'Restart Services',
    icon: RefreshCw,
    items: [
      { label: 'Database Server',               to: '/services' },
      { label: 'DNS Server',                    to: '/services' },
      { label: 'HTTP Server (Apache)',           to: '/services' },
      { label: 'IMAP Server',                   to: '/services' },
      { label: 'Mail Server (Exim)',             to: '/services' },
      { label: 'Mailing List Manager (Mailman)', to: '/services' },
      { label: 'PHP-FPM service for Apache',    to: '/services' },
      { label: 'SSH Server (OpenSSH)',           to: '/services' },
    ],
  },
  {
    id: 'development',
    label: 'Development',
    icon: Code2,
    items: [
      { label: 'Apps Managed by AppConfig',         to: '/settings' },
      { label: 'NixPanel Development Forum',         to: '/settings' },
      { label: 'NixPanel Plugin File Generator',     to: '/settings' },
      { label: 'Developer Documentation',            to: '/settings' },
      { label: 'Manage API Tokens',                  to: '/settings' },
      { label: 'Manage Hooks',                       to: '/settings' },
      { label: 'OpenAPI Documentation for NixPanel', to: '/settings' },
      { label: 'OpenAPI Documentation for WHM',      to: '/settings' },
    ],
  },
  {
    id: 'plugins',
    label: 'Plugins',
    icon: Puzzle,
    items: [
      { label: 'Backuply by Softaculous',   to: '/backup'   },
      { label: 'ImunifyAV',                 to: '/security' },
      { label: 'Server Monitoring',         to: '/system'   },
      { label: 'SitePad Website Builder',   to: '/settings' },
      { label: 'Softaculous - Instant Installs', to: '/settings' },
      { label: 'WP Toolkit',                to: '/settings' },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isItemActive(to: string, pathname: string) {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(to + '/')
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [search, setSearch] = useState('')

  // ── Version / upgrade state ──────────────────────────────────────────────
  type VersionInfo = { currentVersion: string; latestVersion: string | null; updateAvailable: boolean }
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [upgradeState, setUpgradeState] = useState<'idle' | 'confirm' | 'running' | 'done' | 'error'>('idle')

  const fetchVersion = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/nixserver/system/version')
      setVersionInfo(data.data)
    } catch { /* non-fatal */ }
  }, [])

  useEffect(() => { fetchVersion() }, [fetchVersion])

  const handleUpgrade = async () => {
    if (upgradeState === 'confirm') {
      setUpgradeState('running')
      try {
        await axios.post('/api/nixserver/system/upgrade')
        setUpgradeState('done')
      } catch {
        setUpgradeState('error')
      }
    } else {
      setUpgradeState('confirm')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  const [openCats, setOpenCats] = useState<Set<string>>(() => {
    // Auto-open the category that contains the active route on first render
    const active = NAV.find(cat =>
      cat.items.some(item => isItemActive(item.to, location.pathname))
    )
    return active ? new Set([active.id]) : new Set()
  })

  // When the route changes (e.g. user navigates), auto-open the matching category
  useEffect(() => {
    const active = NAV.find(cat =>
      cat.items.some(item => isItemActive(item.to, location.pathname))
    )
    if (active) {
      setOpenCats(prev => prev.has(active.id) ? prev : new Set([...prev, active.id]))
    }
  }, [location.pathname])

  const toggleCat = (id: string) => {
    setOpenCats(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Filter nav based on search query
  const filteredNav = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return NAV
    return NAV.map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.label.toLowerCase().includes(q)),
    })).filter(cat =>
      cat.items.length > 0 || cat.label.toLowerCase().includes(q)
    )
  }, [search])

  // When searching, all matching categories are forced open
  const effectiveOpen = (id: string) =>
    search.trim() ? filteredNav.some(c => c.id === id) : openCats.has(id)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117]">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`flex flex-col transition-all duration-200 bg-[#1a1d27] border-r border-[#2a2d3e] overflow-hidden flex-shrink-0 ${
          sidebarOpen ? 'w-72' : 'w-0'
        }`}
      >
        {/* Branding */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-[#2a2d3e] min-h-[57px] flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-semibold leading-tight whitespace-nowrap">NixServer</p>
            <p className="text-[#64748b] text-xs whitespace-nowrap">Admin Panel</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-[#2a2d3e] flex-shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4a5568] pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-md text-xs text-[#94a3b8] placeholder-[#4a5568] pl-7 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-[#94a3b8]"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-1 scrollbar-thin">

          {/* Dashboard — always at the top */}
          <Link
            to="/"
            className={`flex items-center gap-2.5 px-3 py-1.5 mx-2 my-0.5 rounded-md text-xs transition-colors ${
              location.pathname === '/'
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-[#94a3b8] hover:bg-[#1e2130] hover:text-white'
            }`}
          >
            <LayoutDashboard size={13} className="flex-shrink-0" />
            <span className="truncate">Dashboard</span>
          </Link>

          {/* Categories */}
          {filteredNav.map(cat => {
            const isOpen = effectiveOpen(cat.id)
            const Icon = cat.icon
            const hasActive = cat.items.some(item => isItemActive(item.to, location.pathname))

            return (
              <div key={cat.id} className="mx-2 my-0.5">
                {/* Category header */}
                <button
                  onClick={() => !search.trim() && toggleCat(cat.id)}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    hasActive && !search.trim()
                      ? 'text-indigo-300'
                      : 'text-[#64748b] hover:text-[#94a3b8]'
                  } ${search.trim() ? 'cursor-default' : ''}`}
                >
                  <Icon size={13} className="flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{cat.label}</span>
                  {!search.trim() && (
                    isOpen
                      ? <ChevronDown size={11} className="flex-shrink-0 opacity-60" />
                      : <ChevronRight size={11} className="flex-shrink-0 opacity-60" />
                  )}
                </button>

                {/* Items */}
                {isOpen && (
                  <div className="ml-3 pl-2 border-l border-[#2a2d3e] mt-0.5 mb-1">
                    {cat.items.map(item => {
                      const active = isItemActive(item.to, location.pathname)
                      return (
                        <Link
                          key={item.label}
                          to={item.to}
                          className={`block px-2 py-1 rounded text-xs transition-colors truncate ${
                            active
                              ? 'text-indigo-400 bg-indigo-600/10'
                              : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#1e2130]'
                          }`}
                        >
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Empty search state */}
          {search.trim() && filteredNav.length === 0 && (
            <p className="text-center text-[#4a5568] text-xs py-6">No results</p>
          )}
        </nav>

        {/* Version + upgrade */}
        <div className="border-t border-[#2a2d3e] px-3 pt-2.5 pb-1 flex-shrink-0">
          {versionInfo ? (
            <div className="space-y-1.5">
              {/* Version row */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  {versionInfo.updateAvailable ? (
                    <AlertCircle size={11} className="text-amber-400 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
                  )}
                  <span className="text-[#64748b] text-[10px]">
                    v{versionInfo.currentVersion}
                  </span>
                  {versionInfo.updateAvailable && versionInfo.latestVersion && (
                    <span className="text-amber-400 text-[10px]">
                      → v{versionInfo.latestVersion}
                    </span>
                  )}
                </div>
                <button
                  onClick={fetchVersion}
                  title="Check for updates"
                  className="text-[#4a5568] hover:text-[#94a3b8] transition-colors"
                >
                  <RefreshCcw size={10} />
                </button>
              </div>

              {/* Upgrade button */}
              {upgradeState === 'done' ? (
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-emerald-600/10 text-emerald-400 text-[10px]">
                  <CheckCircle2 size={11} />
                  <span>Upgrade started — panel restarting…</span>
                </div>
              ) : upgradeState === 'error' ? (
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-red-600/10 text-red-400 text-[10px]">
                  <AlertCircle size={11} />
                  <span>Upgrade failed — check logs</span>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    onClick={handleUpgrade}
                    disabled={upgradeState === 'running'}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
                      upgradeState === 'confirm'
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                        : versionInfo.updateAvailable
                          ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30'
                          : 'bg-[#1e2130] text-[#64748b] hover:text-[#94a3b8]'
                    }`}
                  >
                    {upgradeState === 'running' ? (
                      <><Loader2 size={10} className="animate-spin" /><span>Upgrading…</span></>
                    ) : upgradeState === 'confirm' ? (
                      <><ArrowUpCircle size={10} /><span>Confirm upgrade</span></>
                    ) : versionInfo.updateAvailable ? (
                      <><ArrowUpCircle size={10} /><span>Upgrade available</span></>
                    ) : (
                      <><ArrowUpCircle size={10} /><span>Upgrade panel</span></>
                    )}
                  </button>
                  {upgradeState === 'confirm' && (
                    <button
                      onClick={() => setUpgradeState('idle')}
                      className="px-2 py-1.5 rounded-md bg-[#1e2130] text-[#64748b] hover:text-[#94a3b8] text-[10px] transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-1 py-1">
              <Loader2 size={10} className="animate-spin text-[#4a5568]" />
              <span className="text-[#4a5568] text-[10px]">Checking version…</span>
            </div>
          )}
        </div>

        {/* User + logout */}
        <div className="border-t border-[#2a2d3e] p-3 flex-shrink-0">
          <div className="px-1 mb-2">
            <p className="text-white text-xs font-medium truncate">{user?.username}</p>
            <p className="text-[#64748b] text-xs truncate">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-[#94a3b8] hover:bg-[#1e2130] hover:text-red-400 transition-colors text-xs"
          >
            <LogOut size={14} className="flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 py-3 bg-[#1a1d27] border-b border-[#2a2d3e] min-h-[57px] flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="text-[#64748b] hover:text-white transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex-1" />
          <span className="text-[#64748b] text-xs">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
