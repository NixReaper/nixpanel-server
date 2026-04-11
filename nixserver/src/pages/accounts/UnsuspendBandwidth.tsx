import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, RefreshCw, UserCheck } from 'lucide-react'
import { api } from '../../api/client'

interface BandwidthAccount {
  id: number
  username: string
  domain: string
  status: string
  bandwidthUsedMb: number
  suspendReason: string | null
  package?: { name: string; bandwidthMb: number }
}

export default function UnsuspendBandwidth() {
  const [items, setItems] = useState<BandwidthAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [unsuspending, setUnsuspending] = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [message, setMessage] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const r = await api.get('/nixserver/accounts/bandwidth')
      const all: BandwidthAccount[] = r.data.data
      setItems(all.filter(a =>
        a.status === 'suspended' &&
        a.suspendReason?.toLowerCase().includes('bandwidth')
      ))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleUnsuspend = async (id: number, username: string) => {
    setUnsuspending(prev => new Set(prev).add(id))
    try {
      await api.post(`/nixserver/accounts/${id}/unsuspend`)
      setItems(prev => prev.filter(a => a.id !== id))
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed')
    } finally {
      setUnsuspending(prev => { const s = new Set(prev); s.delete(id); return s })
      void username
    }
  }

  const handleUnsuspendAll = async () => {
    if (!confirm(`Unsuspend all ${items.length} bandwidth-exceeded accounts?`)) return
    setBulkLoading(true)
    try {
      const r = await api.post('/nixserver/accounts/unsuspend-bandwidth-exceeded')
      const results = r.data.data as { username: string; success: boolean }[]
      const count = results.filter(x => x.success).length
      setMessage(`Successfully unsuspended ${count} account${count !== 1 ? 's' : ''}.`)
      await fetchData()
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Bulk unsuspend failed')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/accounts" className="flex items-center gap-1 text-[#64748b] hover:text-white transition-colors">
          <ChevronLeft size={14} /> Accounts
        </Link>
        <span className="text-[#2a2d3e]">/</span>
        <span className="text-white">Unsuspend Bandwidth Exceeders</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">Unsuspend Bandwidth Exceeders</h1>
          <p className="text-[#64748b] text-sm">{items.length} account{items.length !== 1 ? 's' : ''} suspended for bandwidth overage</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleUnsuspendAll}
            disabled={bulkLoading || items.length === 0}
            className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <UserCheck size={15} /> {bulkLoading ? 'Unsuspending...' : 'Unsuspend All'}
          </button>
        </div>
      </div>

      {message && (
        <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">{message}</p>
      )}

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2d3e]">
              {['Username', 'Domain', 'Bandwidth Used', 'Limit', 'Suspend Reason', ''].map(h => (
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
                <td className="px-4 py-3 text-amber-400 font-mono text-xs">{acc.bandwidthUsedMb.toLocaleString()} MB</td>
                <td className="px-4 py-3 text-[#94a3b8] font-mono text-xs">
                  {acc.package?.bandwidthMb ? `${acc.package.bandwidthMb.toLocaleString()} MB` : '—'}
                </td>
                <td className="px-4 py-3 text-amber-400 text-xs">{acc.suspendReason ?? '—'}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleUnsuspend(acc.id, acc.username)}
                    disabled={unsuspending.has(acc.id)}
                    className="flex items-center gap-1.5 text-xs bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <UserCheck size={12} /> {unsuspending.has(acc.id) ? 'Unsuspending...' : 'Unsuspend'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="text-center text-[#64748b] py-8">No bandwidth-exceeded suspended accounts</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
