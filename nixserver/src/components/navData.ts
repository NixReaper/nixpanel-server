import type { ComponentType } from 'react'
import {
  LayoutDashboard, Settings, HelpCircle, Network, BookUser, UserCog,
  Wrench, Languages, HardDrive, GitFork, RefreshCw, Activity,
  ArrowRightLeft, Paintbrush, Package,
  Globe, Database, Wifi, Box, Mail, HeartPulse, Lock,
  ShoppingBag, Code2, Puzzle, RotateCcw,
} from 'lucide-react'
import type { NixserverModuleId } from '../modules/catalog'
import { accountsNavCategories } from '../modules/accounts'

export type NavItem = {
  label: string
  to: string
  moduleId: NixserverModuleId
}

export type NavCategory = {
  id: string
  label: string
  icon: ComponentType<{ size?: number | string; className?: string }>
  to?: string
  overviewModuleId?: NixserverModuleId
  items: NavItem[]
}

function item(label: string, to: string, moduleId: NixserverModuleId): NavItem {
  return { label, to, moduleId }
}

export function isItemActive(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(to + '/')
}

const NAV: NavCategory[] = [
  {
    id: 'server-config',
    label: 'Server Configuration',
    icon: Settings,
    to: '/server-configuration',
    overviewModuleId: 'server-configuration',
    items: [
      item('Basic NixServer Setup', '/server-configuration/basic-setup', 'server-configuration'),
      item('Change Root Password', '/server-configuration/change-root', 'server-configuration'),
      item('Configure Analytics', '/server-configuration/analytics', 'server-configuration'),
      item('Configure Cron Jobs', '/server-configuration/cron-jobs', 'server-configuration'),
      item('Initial Quota Setup', '/server-configuration/quota-setup', 'server-configuration'),
      item('Link Server Nodes', '/server-configuration/link-nodes', 'server-configuration'),
      item('Server Profile', '/server-configuration/server-profile', 'server-configuration'),
      item('Server Time', '/server-configuration/server-time', 'server-configuration'),
      item('Statistics Software', '/server-configuration/statistics-software', 'server-configuration'),
      item('Terminal', '/server-configuration/terminal', 'server-configuration'),
      item('Tweak Settings', '/server-configuration/tweak-settings', 'server-configuration'),
      item('Update Preferences', '/server-configuration/update-preferences', 'server-configuration'),
      item('NixServer Marketplace', '/server-configuration/marketplace', 'server-configuration'),
    ],
  },
  {
    id: 'support',
    label: 'Support',
    icon: HelpCircle,
    items: [
      item('Grant NixPanel Support Access', '/security', 'security'),
      item('Support Center', '/settings', 'server-configuration'),
    ],
  },
  {
    id: 'networking',
    label: 'Networking Setup',
    icon: Network,
    items: [
      item('Change Hostname', '/security', 'security'),
      item('Resolver Configuration', '/security', 'security'),
      item('Security Center', '/security', 'security'),
      item('Apache mod_userdir Tweak', '/webserver', 'webserver'),
      item('SMTP Restrictions', '/email', 'email'),
      item('Compiler Access', '/security', 'security'),
      item('Configure Security Policies', '/security', 'security'),
      item('mXSTOP Brute Force Protection', '/security', 'security'),
      item('Host Access Control', '/security', 'security'),
      item('Manage External Authentications', '/security', 'security'),
      item("Manage root's SSH Keys", '/security', 'security'),
      item('Manage Wheel Group Users', '/security', 'security'),
      item('ModSecurity Configuration', '/security', 'security'),
      item('ModSecurity Tools', '/security', 'security'),
      item('ModSecurity Vendors', '/security', 'security'),
      item('Password Strength Configuration', '/security', 'security'),
      item('Security Advisor', '/security', 'security'),
      item('Security Questions', '/security', 'security'),
      item('Shell Fork Bomb Protection', '/security', 'security'),
      item('SSH Password Authorization Tweak', '/security', 'security'),
      item('Traceroute Enable/Disable', '/security', 'security'),
      item('Two-Factor Authentication', '/security', 'security'),
    ],
  },
  {
    id: 'contacts',
    label: 'Server Contacts',
    icon: BookUser,
    items: [
      item('Contact Manager', '/settings', 'server-configuration'),
      item('Edit System Mail Preferences', '/email', 'email'),
    ],
  },
  {
    id: 'resellers',
    label: 'Resellers',
    icon: UserCog,
    items: [
      item('Change Ownership of an Account', '/resellers', 'resellers'),
      item('Change Ownership of Multiple Accounts', '/resellers', 'resellers'),
      item('Edit Reseller Nameservers and Privileges', '/resellers', 'resellers'),
      item('Email All Resellers', '/resellers', 'resellers'),
      item("Manage Reseller's IP Delegation", '/resellers', 'resellers'),
      item("Manage Reseller's Shared IP", '/resellers', 'resellers'),
      item('Reseller Center', '/resellers', 'resellers'),
      item('Reset Resellers', '/resellers', 'resellers'),
      item('Show Reseller Accounts', '/resellers', 'resellers'),
      item('View Reseller Usage', '/resellers', 'resellers'),
    ],
  },
  {
    id: 'service-config',
    label: 'Service Configuration',
    icon: Wrench,
    items: [
      item('Apache Configuration', '/webserver', 'webserver'),
      item('Log Rotation Configuration', '/settings', 'server-configuration'),
      item('Web Disk Configuration', '/settings', 'server-configuration'),
      item('Web Services Configuration', '/settings', 'server-configuration'),
      item('Exim Configuration Manager', '/email', 'email'),
      item('FTP Server Selection', '/settings', 'server-configuration'),
      item('Mailserver Configuration', '/email', 'email'),
      item('Manage Service SSL Certificates', '/ssl', 'ssl'),
      item('Nameserver Selection', '/dns', 'dns'),
      item('Service Manager', '/services', 'services'),
    ],
  },
  {
    id: 'locales',
    label: 'Locales',
    icon: Languages,
    items: [
      item('Configure Application Locales', '/settings', 'server-configuration'),
      item('Copy a Locale', '/settings', 'server-configuration'),
      item('Delete a Locale', '/settings', 'server-configuration'),
      item('Edit a Locale', '/settings', 'server-configuration'),
      item('Locale XML Download', '/settings', 'server-configuration'),
      item('Locale XML Upload', '/settings', 'server-configuration'),
      item('View Available Locales', '/settings', 'server-configuration'),
    ],
  },
  {
    id: 'backup',
    label: 'Backup',
    icon: HardDrive,
    items: [
      item('Backup Configuration', '/backup', 'backup'),
      item('Backup Restoration', '/backup', 'backup'),
      item('Backup User Selection', '/backup', 'backup'),
      item('File and Directory Restoration', '/backup', 'backup'),
    ],
  },
  {
    id: 'clusters',
    label: 'Clusters',
    icon: GitFork,
    items: [
      item('Configuration Cluster', '/settings', 'server-configuration'),
      item('DNS Cluster', '/dns', 'dns'),
      item('Remote Access Key', '/security', 'security'),
    ],
  },
  {
    id: 'reboot',
    label: 'System Reboot',
    icon: RotateCcw,
    items: [
      item('Forceful Server Reboot', '/system', 'system'),
      item('Graceful Server Reboot', '/system', 'system'),
    ],
  },
  {
    id: 'server-status',
    label: 'Server Status',
    icon: Activity,
    items: [
      item('Apache Status', '/webserver', 'webserver'),
      item('Daily Process Log', '/system', 'system'),
      item('Server Information', '/system', 'system'),
      item('Service Status', '/services', 'services'),
      item('Task Queue Monitor', '/system', 'system'),
    ],
  },
  ...accountsNavCategories,
  {
    id: 'transfers',
    label: 'Transfers',
    icon: ArrowRightLeft,
    items: [
      item('Convert Addon Domain to Account', '/accounts', 'accounts'),
      item('Review Transfers and Restores', '/accounts', 'accounts'),
      item('Transfer or Restore a cPanel Account', '/accounts', 'accounts'),
      item('Transfer Tool', '/accounts', 'accounts'),
    ],
  },
  {
    id: 'themes',
    label: 'Themes',
    icon: Paintbrush,
    items: [
      item('Theme Manager', '/settings', 'server-configuration'),
    ],
  },
  {
    id: 'packages',
    label: 'Packages',
    icon: Package,
    items: [
      item('Add a Package', '/packages', 'packages'),
      item('Delete a Package', '/packages', 'packages'),
      item('Edit a Package', '/packages', 'packages'),
      item('Feature Manager', '/packages', 'packages'),
    ],
  },
  {
    id: 'dns',
    label: 'DNS Functions',
    icon: Globe,
    items: [
      item('Add a DNS Zone', '/dns', 'dns'),
      item('Add an A Entry for Hostname', '/dns', 'dns'),
      item('Delete a DNS Zone', '/dns', 'dns'),
      item('DNS Zone Manager', '/dns', 'dns'),
      item('Edit Zone Templates', '/dns', 'dns'),
      item('Email DNS Record Manager', '/dns', 'dns'),
      item('Email Routing Configuration', '/email', 'email'),
      item('Enable DKIM/SPF Globally', '/email', 'email'),
      item('Nameserver Record Report', '/dns', 'dns'),
      item('Park a Domain', '/dns', 'dns'),
      item('Perform a DNS Cleanup', '/dns', 'dns'),
      item('Set Zone TTL', '/dns', 'dns'),
      item('Setup/Edit Domain Forwarding', '/dns', 'dns'),
      item('Synchronize DNS Records', '/dns', 'dns'),
    ],
  },
  {
    id: 'databases',
    label: 'Database Services',
    icon: Database,
    items: [
      item('Change Database Root Password', '/settings', 'server-configuration'),
      item('Change Database User Password', '/settings', 'server-configuration'),
      item('Database Map Tool', '/settings', 'server-configuration'),
      item('Edit Database Configuration', '/settings', 'server-configuration'),
      item('Manage Database Access Hosts', '/settings', 'server-configuration'),
      item('Manage Database Profiles', '/settings', 'server-configuration'),
      item('Manage Database Users', '/settings', 'server-configuration'),
      item('Manage Databases', '/settings', 'server-configuration'),
      item('phpMyAdmin', '/settings', 'server-configuration'),
      item('Repair Databases', '/settings', 'server-configuration'),
      item('Show Database Processes', '/settings', 'server-configuration'),
      item('Upgrade Database Version', '/settings', 'server-configuration'),
    ],
  },
  {
    id: 'ip',
    label: 'IP Functions',
    icon: Wifi,
    items: [
      item('IPv6 Ranges', '/security', 'security'),
      item('Add a New IP Address', '/security', 'security'),
      item('Assign IPv6 Address', '/security', 'security'),
      item('Configure Remote Service IPs', '/security', 'security'),
      item('IP Migration Wizard', '/security', 'security'),
      item('Rebuild the IP Address Pool', '/security', 'security'),
      item('Show IP Address Usage', '/security', 'security'),
      item('Show or Delete Current IPs', '/security', 'security'),
      item('Show/Edit Reserved IPs', '/security', 'security'),
    ],
  },
  {
    id: 'software',
    label: 'Software',
    icon: Box,
    items: [
      item('Install a Perl Module', '/system', 'system'),
      item('Install Distro Packages', '/system', 'system'),
      item('Module Installers', '/system', 'system'),
      item('MultiPHP INI Editor', '/php', 'php'),
      item('MultiPHP Manager', '/php', 'php'),
      item('NGINX Manager', '/webserver', 'webserver'),
      item('Rebuild RPM Database', '/system', 'system'),
      item('System Update', '/system', 'system'),
      item('Update Server Software', '/system', 'system'),
      item('EasyApache 4', '/webserver', 'webserver'),
    ],
  },
  {
    id: 'email',
    label: 'Email',
    icon: Mail,
    items: [
      item('Email Deliverability', '/email', 'email'),
      item('Filter Incoming Emails by Country', '/email', 'email'),
      item('Filter Incoming Emails by Domain', '/email', 'email'),
      item('Greylisting', '/email', 'email'),
      item('Mail Delivery Reports', '/email', 'email'),
      item('Mail Queue Manager', '/email', 'email'),
      item('Mail Troubleshooter', '/email', 'email'),
      item('Mailbox Conversion', '/email', 'email'),
      item('Repair Mailbox Permissions', '/email', 'email'),
      item('Spamd Startup Configuration', '/email', 'email'),
      item('View Mail Statistics Summary', '/email', 'email'),
      item('View Relayers', '/email', 'email'),
      item('View Sent Summary', '/email', 'email'),
    ],
  },
  {
    id: 'system-health',
    label: 'System Health',
    icon: HeartPulse,
    items: [
      item('Background Process Killer', '/system', 'system'),
      item('Process Manager', '/system', 'system'),
      item('Show Current Disk Usage', '/system', 'system'),
      item('Show Current Running Processes', '/system', 'system'),
    ],
  },
  {
    id: 'nixpanel',
    label: 'NixPanel',
    icon: LayoutDashboard,
    items: [
      item('Change Log', '/settings', 'server-configuration'),
      item('Customization', '/settings', 'server-configuration'),
      item('Manage Plugins', '/settings', 'server-configuration'),
      item('Modify NixPanel News', '/settings', 'server-configuration'),
      item('Reset a Mailman Password', '/email', 'email'),
      item('Upgrade to Latest Version', '/settings', 'server-configuration'),
    ],
  },
  {
    id: 'ssl',
    label: 'SSL/TLS',
    icon: Lock,
    items: [
      item('Generate an SSL Certificate and Signing Request', '/ssl', 'ssl'),
      item('Install an SSL Certificate on a Domain', '/ssl', 'ssl'),
      item('Manage AutoSSL', '/ssl', 'ssl'),
      item('Manage SSL Hosts', '/ssl', 'ssl'),
      item('Purchase and Install an SSL Certificate', '/ssl', 'ssl'),
      item('SSL Storage Manager', '/ssl', 'ssl'),
      item('SSL/TLS Configuration', '/ssl', 'ssl'),
    ],
  },
  {
    id: 'market',
    label: 'Market',
    icon: ShoppingBag,
    items: [
      item('Market Provider Manager', '/settings', 'server-configuration'),
    ],
  },
  {
    id: 'restart-services',
    label: 'Restart Services',
    icon: RefreshCw,
    items: [
      item('Database Server', '/services', 'services'),
      item('DNS Server', '/services', 'services'),
      item('HTTP Server (Apache)', '/services', 'services'),
      item('IMAP Server', '/services', 'services'),
      item('Mail Server (Exim)', '/services', 'services'),
      item('Mailing List Manager (Mailman)', '/services', 'services'),
      item('PHP-FPM service for Apache', '/services', 'services'),
      item('SSH Server (OpenSSH)', '/services', 'services'),
    ],
  },
  {
    id: 'development',
    label: 'Development',
    icon: Code2,
    items: [
      item('Apps Managed by AppConfig', '/settings', 'server-configuration'),
      item('NixPanel Development Forum', '/settings', 'server-configuration'),
      item('NixPanel Plugin File Generator', '/settings', 'server-configuration'),
      item('Developer Documentation', '/settings', 'server-configuration'),
      item('Manage API Tokens', '/settings', 'server-configuration'),
      item('Manage Hooks', '/settings', 'server-configuration'),
      item('OpenAPI Documentation for NixPanel', '/settings', 'server-configuration'),
      item('OpenAPI Documentation for NixServer', '/settings', 'server-configuration'),
    ],
  },
  {
    id: 'plugins',
    label: 'Plugins',
    icon: Puzzle,
    items: [
      item('Backuply by Softaculous', '/backup', 'backup'),
      item('ImunifyAV', '/security', 'security'),
      item('Server Monitoring', '/system', 'system'),
      item('SitePad Website Builder', '/settings', 'server-configuration'),
      item('Softaculous - Instant Installs', '/settings', 'server-configuration'),
      item('WP Toolkit', '/settings', 'server-configuration'),
    ],
  },
]

export function getNav(enabledModules: readonly NixserverModuleId[]): NavCategory[] {
  const enabled = new Set(enabledModules)

  return NAV.map(category => {
    const items = category.items.filter(entry => enabled.has(entry.moduleId))
    const to = category.overviewModuleId && !enabled.has(category.overviewModuleId)
      ? undefined
      : category.to

    return { ...category, to, items }
  }).filter(category => category.items.length > 0)
}
