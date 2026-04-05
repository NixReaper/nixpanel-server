import React, { useEffect, useState } from 'react'
import { RefreshCw, HardDrive, Wifi } from 'lucide-react'
import { api } from '../api/client'

interface Stats {
  diskUsedMb: number; diskLimitMb: number
  bandwidthUsedMb: number; bandwidthLimitMb: number
  counts: Record<string, number>
}

function Bar({ label, used, limit, icon: Icon }: { label: string; used: number; limit: number; icon: React.ComponentType<{ size?: number; className?: string }> }) {
  const pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-sky-500'
  return (
    <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-sky-400" />
        <span className="text-white text-sm font-medium">{label}</span>
      </div>
      <div className="flex justify-between text-xs mb-2 text-[#64748b]">
        <span>{used} MB used</span>
        <span>{limit === 0 ? 'Unlimited' : `${limit} MB total`} {limit > 0 && `(${pct}%)`}</span>
      </div>
      <div className="h-2 bg-[#1e2d45] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Stats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try { const r = await api.get('/nixclient/stats'); setStats(r.data.data) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const labels: Record<string, string> = {
    emailAccounts: 'Email Accounts', databases: 'Databases', ftpAccounts: 'FTP Accounts',
    subdomains: 'Subdomains', addonDomains: 'Addon Domains', parkedDomains: 'Parked Domains',
    sslCertificates: 'SSL Certificates', cronJobs: 'Cron Jobs',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">Statistics</h1><p className="text-[#64748b] text-sm">Account resource usage</p></div>
        <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#1e2d45] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Bar label="Disk Space" used={stats.diskUsedMb} limit={stats.diskLimitMb} icon={HardDrive} />
            <Bar label="Bandwidth" used={stats.bandwidthUsedMb} limit={stats.bandwidthLimitMb} icon={Wifi} />
          </div>
          <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
            <h2 className="text-white text-sm font-medium mb-4">Feature Usage</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(stats.counts).map(([key, val]) => (
                <div key={key} className="text-center">
                  <p className="text-white text-2xl font-bold">{val}</p>
                  <p className="text-[#64748b] text-xs mt-0.5">{labels[key] ?? key}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-[#64748b] py-12">{loading ? 'Loading...' : 'No data'}</div>
      )}
    </div>
  )
}
