import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, MoreVertical, UserX, UserCheck, Trash2, RefreshCw } from 'lucide-react'
import { api } from '../api/client'

interface Account {
  id: number
  username: string
  domain: string
  email: string
  status: string
  diskUsedMb: number
  bandwidthUsedMb: number
  ipAddress: string | null
  createdAt: string
  package?: { name: string; diskMb: number }
}

interface PageData {
  items: Account[]
  total: number
  page: number
  totalPages: number
}

const statusColor: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  terminated: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function Accounts() {
  const [data, setData] = useState<PageData | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [actionMenu, setActionMenu] = useState<number | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      const r = await api.get(`/nixserver/accounts?${params}`)
      setData(r.data.data)
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => { fetch() }, [fetch])

  const action = async (id: number, act: 'suspend' | 'unsuspend' | 'terminate') => {
    setActionMenu(null)
    if (act === 'terminate' && !confirm('Terminate this account? This cannot be undone.')) return
    try {
      if (act === 'suspend') await api.post(`/nixserver/accounts/${id}/suspend`)
      else if (act === 'unsuspend') await api.post(`/nixserver/accounts/${id}/unsuspend`)
      else await api.delete(`/nixserver/accounts/${id}`)
      fetch()
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Action failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">Accounts</h1>
          <p className="text-[#64748b] text-sm">{data?.total ?? 0} total</p>
        </div>
        <Link
          to="/accounts/create"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Create Account
        </Link>
      </div>

      {/* Filters */}
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
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="bg-[#1a1d27] border border-[#2a2d3e] text-[#94a3b8] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
        </select>
        <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2d3e]">
              {['Username', 'Domain', 'Package', 'Status', 'IP', 'Created', ''].map(h => (
                <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !data && (
              <tr><td colSpan={7} className="text-center text-[#64748b] py-8">Loading...</td></tr>
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
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[acc.status] ?? ''}`}>
                    {acc.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#64748b] font-mono text-xs">{acc.ipAddress ?? '—'}</td>
                <td className="px-4 py-3 text-[#64748b] text-xs">{new Date(acc.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 relative">
                  <button
                    onClick={() => setActionMenu(actionMenu === acc.id ? null : acc.id)}
                    className="p-1 text-[#64748b] hover:text-white rounded transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {actionMenu === acc.id && (
                    <div className="absolute right-4 top-8 z-10 bg-[#1e2130] border border-[#2a2d3e] rounded-lg shadow-lg py-1 w-36">
                      {acc.status === 'active' ? (
                        <button onClick={() => action(acc.id, 'suspend')} className="flex items-center gap-2 w-full px-3 py-2 text-amber-400 hover:bg-[#2a2d3e] text-xs">
                          <UserX size={14} /> Suspend
                        </button>
                      ) : acc.status === 'suspended' ? (
                        <button onClick={() => action(acc.id, 'unsuspend')} className="flex items-center gap-2 w-full px-3 py-2 text-emerald-400 hover:bg-[#2a2d3e] text-xs">
                          <UserCheck size={14} /> Unsuspend
                        </button>
                      ) : null}
                      <button onClick={() => action(acc.id, 'terminate')} className="flex items-center gap-2 w-full px-3 py-2 text-red-400 hover:bg-[#2a2d3e] text-xs">
                        <Trash2 size={14} /> Terminate
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr><td colSpan={7} className="text-center text-[#64748b] py-8">No accounts found</td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
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
