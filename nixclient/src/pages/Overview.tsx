import React, { useEffect, useState } from 'react'
import { Database, Mail, Globe, FolderOpen, Lock, Anchor, Clock, HardDrive } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

interface Stats {
  diskUsedMb: number
  diskLimitMb: number
  bandwidthUsedMb: number
  bandwidthLimitMb: number
  counts: {
    emailAccounts: number; databases: number; ftpAccounts: number
    subdomains: number; addonDomains: number; sslCertificates: number; cronJobs: number
  }
  limits: {
    maxEmailAccounts: number; maxDatabases: number; maxFtpAccounts: number
    maxSubdomains: number; maxAddonDomains: number; maxCronJobs: number
  } | null
}

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-sky-500'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#94a3b8]">{label}</span>
        <span className="text-[#64748b]">{used} / {limit === 0 ? '∞' : limit} MB {limit > 0 && `(${pct}%)`}</span>
      </div>
      <div className="h-1.5 bg-[#1e2d45] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CountCard({ icon: Icon, label, used, limit, to }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; used: number; limit: number; to: string }) {
  return (
    <a href={to} className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4 hover:border-sky-500/30 transition-colors block">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#64748b] text-xs">{label}</span>
        <Icon size={14} className="text-sky-400" />
      </div>
      <p className="text-white text-2xl font-bold">{used}</p>
      {limit > 0 && <p className="text-[#64748b] text-xs mt-0.5">of {limit}</p>}
      {limit === 0 && <p className="text-[#64748b] text-xs mt-0.5">unlimited</p>}
    </a>
  )
}

export default function Overview() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get('/nixclient/stats').then(r => setStats(r.data.data)).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-xl font-semibold">Welcome, {user?.username}</h1>
        <p className="text-[#64748b] text-sm">{user?.domain}</p>
      </div>

      {/* Resource usage */}
      {stats && (
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4 space-y-4">
          <h2 className="text-white text-sm font-medium">Resource Usage</h2>
          <UsageBar used={stats.diskUsedMb} limit={stats.diskLimitMb} label="Disk Space" />
          <UsageBar used={stats.bandwidthUsedMb} limit={stats.bandwidthLimitMb} label="Bandwidth" />
        </div>
      )}

      {/* Feature grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          <CountCard icon={Mail} label="Email Accounts" used={stats.counts.emailAccounts} limit={stats.limits?.maxEmailAccounts ?? 0} to="/email" />
          <CountCard icon={Database} label="Databases" used={stats.counts.databases} limit={stats.limits?.maxDatabases ?? 0} to="/databases" />
          <CountCard icon={Anchor} label="FTP Accounts" used={stats.counts.ftpAccounts} limit={stats.limits?.maxFtpAccounts ?? 0} to="/ftp" />
          <CountCard icon={Globe} label="Subdomains" used={stats.counts.subdomains} limit={stats.limits?.maxSubdomains ?? 0} to="/domains" />
          <CountCard icon={Globe} label="Addon Domains" used={stats.counts.addonDomains} limit={stats.limits?.maxAddonDomains ?? 0} to="/domains" />
          <CountCard icon={Lock} label="SSL Certs" used={stats.counts.sslCertificates} limit={0} to="/ssl" />
          <CountCard icon={Clock} label="Cron Jobs" used={stats.counts.cronJobs} limit={stats.limits?.maxCronJobs ?? 0} to="/cron" />
        </div>
      )}
    </div>
  )
}
