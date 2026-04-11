import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { api } from '../../api/client'

interface BandwidthAccount {
  id: number
  username: string
  domain: string
  status: string
  bandwidthUsedMb: number
  package?: { name: string; bandwidthMb: number }
}

export default function BandwidthUsage() {
  const [items, setItems] = useState<BandwidthAccount[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const r = await api.get('/nixserver/accounts/bandwidth')
      setItems(r.data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const statusColor: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    terminated: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/accounts" className="flex items-center gap-1 text-[#64748b] hover:text-white transition-colors">
          <ChevronLeft size={14} /> Accounts
        </Link>
        <span className="text-[#2a2d3e]">/</span>
        <span className="text-white">View Bandwidth Usage</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">View Bandwidth Usage</h1>
          <p className="text-[#64748b] text-sm">{items.length} account{items.length !== 1 ? 's' : ''}, sorted by usage</p>
        </div>
        <button onClick={fetchData} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2d3e]">
              {['Username', 'Domain', 'Bandwidth Used', 'Bandwidth Limit', '% Used', 'Status'].map(h => (
                <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="text-center text-[#64748b] py-8">Loading...</td></tr>
            )}
            {!loading && items.map(acc => {
              const limit = acc.package?.bandwidthMb ?? 0
              const pct = limit > 0 ? Math.min(100, Math.round((acc.bandwidthUsedMb / limit) * 100)) : 0
              const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500'
              return (
                <tr key={acc.id} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130] transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/accounts/${acc.id}`} className="text-indigo-400 hover:text-indigo-300 font-medium">
                      {acc.username}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8]">{acc.domain}</td>
                  <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">{acc.bandwidthUsedMb.toLocaleString()} MB</td>
                  <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">
                    {limit > 0 ? `${limit.toLocaleString()} MB` : '—'}
                  </td>
                  <td className="px-4 py-3 min-w-[140px]">
                    {limit > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[#2a2d3e] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[#94a3b8] text-xs font-mono">{pct}%</span>
                      </div>
                    ) : (
                      <span className="text-[#64748b] text-xs">No limit</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[acc.status] ?? ''}`}>
                      {acc.status}
                    </span>
                  </td>
                </tr>
              )
            })}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="text-center text-[#64748b] py-8">No accounts found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
