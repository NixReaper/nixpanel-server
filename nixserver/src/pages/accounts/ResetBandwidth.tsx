import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, RefreshCw, RotateCcw } from 'lucide-react'
import { api } from '../../api/client'

interface BandwidthAccount {
  id: number
  username: string
  domain: string
  status: string
  bandwidthUsedMb: number
  package?: { name: string; bandwidthMb: number }
}

export default function ResetBandwidth() {
  const [items, setItems] = useState<BandwidthAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState<Set<number>>(new Set())
  const [resetAll, setResetAll] = useState(false)

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

  const handleReset = async (id: number) => {
    setResetting(prev => new Set(prev).add(id))
    try {
      await api.post(`/nixserver/accounts/${id}/reset-bandwidth`)
      setItems(prev => prev.map(a => a.id === id ? { ...a, bandwidthUsedMb: 0 } : a))
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Reset failed')
    } finally {
      setResetting(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  const handleResetAll = async () => {
    if (!confirm(`Reset bandwidth for all ${items.length} accounts?`)) return
    setResetAll(true)
    try {
      await Promise.all(items.map(a => api.post(`/nixserver/accounts/${a.id}/reset-bandwidth`)))
      setItems(prev => prev.map(a => ({ ...a, bandwidthUsedMb: 0 })))
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Bulk reset failed')
    } finally {
      setResetAll(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/accounts" className="flex items-center gap-1 text-[#64748b] hover:text-white transition-colors">
          <ChevronLeft size={14} /> Accounts
        </Link>
        <span className="text-[#2a2d3e]">/</span>
        <span className="text-white">Reset Account Bandwidth Limit</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">Reset Account Bandwidth Limit</h1>
          <p className="text-[#64748b] text-sm">Reset bandwidth counters for individual accounts or all at once.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleResetAll}
            disabled={resetAll || items.length === 0}
            className="flex items-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw size={15} /> {resetAll ? 'Resetting...' : 'Reset All'}
          </button>
        </div>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2d3e]">
              {['Username', 'Domain', 'Bandwidth Used', 'Limit', 'Status', ''].map(h => (
                <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="text-center text-[#64748b] py-8">Loading...</td></tr>
            )}
            {!loading && items.map(acc => (
              <tr key={acc.id} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130] transition-colors">
                <td className="px-4 py-3 text-white font-medium">{acc.username}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{acc.domain}</td>
                <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">{acc.bandwidthUsedMb.toLocaleString()} MB</td>
                <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">
                  {acc.package?.bandwidthMb ? `${acc.package.bandwidthMb.toLocaleString()} MB` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    acc.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    acc.status === 'suspended' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {acc.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleReset(acc.id)}
                    disabled={resetting.has(acc.id) || acc.bandwidthUsedMb === 0}
                    className="flex items-center gap-1.5 text-xs bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <RotateCcw size={12} /> {resetting.has(acc.id) ? 'Resetting...' : 'Reset'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="text-center text-[#64748b] py-8">No accounts found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
