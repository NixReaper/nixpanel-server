import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserCheck, RefreshCw, ChevronLeft } from 'lucide-react'
import { api } from '../../api/client'

interface Account {
  id: number
  username: string
  domain: string
  email: string
  status: string
  suspendReason: string | null
  suspendedAt: string | null
  createdAt: string
  package?: { name: string }
}

interface PageData {
  items: Account[]
  total: number
  page: number
  totalPages: number
}

export default function SuspendedAccounts() {
  const [data, setData] = useState<PageData | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25', status: 'suspended' })
      if (search) params.set('search', search)
      const r = await api.get(`/nixserver/accounts?${params}`)
      setData(r.data.data)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchData() }, [fetchData])

  const unsuspend = async (id: number) => {
    try {
      await api.post(`/nixserver/accounts/${id}/unsuspend`)
      fetchData()
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Action failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/accounts" className="flex items-center gap-1 text-[#64748b] hover:text-white transition-colors">
          <ChevronLeft size={14} /> Accounts
        </Link>
        <span className="text-[#2a2d3e]">/</span>
        <span className="text-white">List Suspended Accounts</span>
      </div>

      <div>
        <h1 className="text-white text-xl font-semibold">List Suspended Accounts</h1>
        <p className="text-[#64748b] text-sm">{data?.total ?? 0} suspended accounts</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search username, domain, email..."
            className="w-full bg-[#1a1d27] border border-[#2a2d3e] text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button onClick={fetchData} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2d3e]">
              {['Username', 'Domain', 'Package', 'Suspend Reason', 'Suspended At', ''].map(h => (
                <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !data && (
              <tr><td colSpan={6} className="text-center text-[#64748b] py-8">Loading...</td></tr>
            )}
            {data?.items.map(acc => (
              <tr key={acc.id} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130] transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/accounts/${acc.id}`} className="text-indigo-400 hover:text-indigo-300 font-medium">
                    {acc.username}
                  </Link>
                  <p className="text-[#64748b] text-xs">{acc.email}</p>
                </td>
                <td className="px-4 py-3 text-[#94a3b8]">{acc.domain}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{acc.package?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-amber-400 text-xs">
                    {acc.suspendReason ?? 'No reason given'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#64748b] text-xs">
                  {acc.suspendedAt ? new Date(acc.suspendedAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => unsuspend(acc.id)}
                    className="flex items-center gap-1.5 text-xs bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <UserCheck size={13} /> Unsuspend
                  </button>
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr><td colSpan={6} className="text-center text-[#64748b] py-8">No suspended accounts</td></tr>
            )}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2d3e]">
            <span className="text-[#64748b] text-xs">
              Page {data.page} of {data.totalPages} ({data.total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="px-3 py-1 text-xs bg-[#1e2130] border border-[#2a2d3e] rounded text-[#94a3b8] disabled:opacity-40 hover:border-indigo-500 transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= data.totalPages}
                className="px-3 py-1 text-xs bg-[#1e2130] border border-[#2a2d3e] rounded text-[#94a3b8] disabled:opacity-40 hover:border-indigo-500 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
