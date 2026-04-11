import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { api } from '../../api/client'

interface SubdomainItem {
  id: number
  subdomain: string
  domain: string
  accountId: number
  documentRoot: string
  status: string
  createdAt: string
  account: { username: string }
}

export default function Subdomains() {
  const [items, setItems] = useState<SubdomainItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const r = await api.get('/nixserver/accounts/subdomains')
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
        <span className="text-white">List Subdomains</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">List Subdomains</h1>
          <p className="text-[#64748b] text-sm">{items.length} subdomain{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={fetchData} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2d3e]">
              {['Subdomain', 'Full Domain', 'Username', 'Document Root', 'Status', 'Created'].map(h => (
                <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="text-center text-[#64748b] py-8">Loading...</td></tr>
            )}
            {!loading && items.map(sd => (
              <tr key={sd.id} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130] transition-colors">
                <td className="px-4 py-3 text-white font-medium">{sd.subdomain}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{sd.domain}</td>
                <td className="px-4 py-3">
                  <span className="text-indigo-400">{sd.account.username}</span>
                </td>
                <td className="px-4 py-3 text-[#64748b] font-mono text-xs truncate max-w-[200px]">{sd.documentRoot}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[sd.status] ?? 'text-[#94a3b8]'}`}>
                    {sd.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#64748b] text-xs">{new Date(sd.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="text-center text-[#64748b] py-8">No subdomains found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
