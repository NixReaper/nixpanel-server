import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { api } from '../../api/client'

interface ParkedDomain {
  id: number
  domain: string
  accountId: number
  status: string
  createdAt: string
  account: { username: string; domain: string }
}

export default function ParkedDomains() {
  const [items, setItems] = useState<ParkedDomain[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const r = await api.get('/nixserver/accounts/parked-domains')
      setItems(r.data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const statusColor: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    inactive: 'bg-[#2a2d3e] text-[#64748b] border-[#2a2d3e]',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/accounts" className="flex items-center gap-1 text-[#64748b] hover:text-white transition-colors">
          <ChevronLeft size={14} /> Accounts
        </Link>
        <span className="text-[#2a2d3e]">/</span>
        <span className="text-white">List Parked Domains</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">List Parked Domains</h1>
          <p className="text-[#64748b] text-sm">{items.length} parked domain{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={fetchData} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2d3e]">
              {['Parked Domain', 'Primary Domain', 'Username', 'Status', 'Created'].map(h => (
                <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="text-center text-[#64748b] py-8">Loading...</td></tr>
            )}
            {!loading && items.map(pd => (
              <tr key={pd.id} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130] transition-colors">
                <td className="px-4 py-3 text-white font-medium">{pd.domain}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{pd.account.domain}</td>
                <td className="px-4 py-3">
                  <span className="text-indigo-400">{pd.account.username}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[pd.status] ?? 'text-[#94a3b8]'}`}>
                    {pd.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#64748b] text-xs">{new Date(pd.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="text-center text-[#64748b] py-8">No parked domains found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
