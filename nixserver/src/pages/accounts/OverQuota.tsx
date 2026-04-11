import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { api } from '../../api/client'

interface OverQuotaAccount {
  id: number
  username: string
  domain: string
  status: string
  diskUsedMb: number
  package: { name: string; diskMb: number; bandwidthMb: number }
}

export default function OverQuota() {
  const [items, setItems] = useState<OverQuotaAccount[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const r = await api.get('/nixserver/accounts/over-quota')
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
        <span className="text-white">Show Accounts Over Quota</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">Show Accounts Over Quota</h1>
          <p className="text-[#64748b] text-sm">{items.length} account{items.length !== 1 ? 's' : ''} over disk quota</p>
        </div>
        <button onClick={fetchData} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2d3e]">
              {['Username', 'Domain', 'Package', 'Disk Used', 'Disk Limit', 'Over By', 'Usage', 'Status'].map(h => (
                <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center text-[#64748b] py-8">Loading...</td></tr>
            )}
            {!loading && items.map(acc => {
              const pct = Math.min(100, Math.round((acc.diskUsedMb / acc.package.diskMb) * 100))
              const overBy = acc.diskUsedMb - acc.package.diskMb
              return (
                <tr key={acc.id} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130] transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/accounts/${acc.id}`} className="text-indigo-400 hover:text-indigo-300 font-medium">
                      {acc.username}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8]">{acc.domain}</td>
                  <td className="px-4 py-3 text-[#94a3b8]">{acc.package.name}</td>
                  <td className="px-4 py-3 text-red-400 font-mono text-xs">{acc.diskUsedMb.toLocaleString()} MB</td>
                  <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">{acc.package.diskMb.toLocaleString()} MB</td>
                  <td className="px-4 py-3 text-red-400 font-mono text-xs font-semibold">+{overBy.toLocaleString()} MB</td>
                  <td className="px-4 py-3 min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#2a2d3e] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-red-400 text-xs font-mono">{pct}%</span>
                    </div>
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
              <tr><td colSpan={8} className="text-center text-[#64748b] py-8">No accounts are over quota</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
