import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, UserX, UserCheck } from 'lucide-react'
import { api } from '../../api/client'
import AccountPicker, { type PickedAccount } from './AccountPicker'

export default function Suspension() {
  const [selected, setSelected] = useState<PickedAccount | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSuspend = async () => {
    if (!selected) return
    setLoading(true); setMessage(''); setError('')
    try {
      await api.post(`/nixserver/accounts/${selected.id}/suspend`, { reason: reason || undefined })
      setMessage(`Account "${selected.username}" has been suspended.`)
      setSelected(prev => prev ? { ...prev, status: 'suspended' } : null)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  const handleUnsuspend = async () => {
    if (!selected) return
    setLoading(true); setMessage(''); setError('')
    try {
      await api.post(`/nixserver/accounts/${selected.id}/unsuspend`)
      setMessage(`Account "${selected.username}" has been unsuspended.`)
      setSelected(prev => prev ? { ...prev, status: 'active' } : null)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/accounts" className="flex items-center gap-1 text-[#64748b] hover:text-white transition-colors">
          <ChevronLeft size={14} /> Accounts
        </Link>
        <span className="text-[#2a2d3e]">/</span>
        <span className="text-white">Manage Account Suspension</span>
      </div>

      <div>
        <h1 className="text-white text-xl font-semibold">Manage Account Suspension</h1>
        <p className="text-[#64748b] text-sm">Search for an account to suspend or unsuspend it.</p>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-5 space-y-4">
        <AccountPicker onSelect={setSelected} selected={selected} />

        {selected && (
          <div className="space-y-4 pt-2 border-t border-[#2a2d3e]">
            {selected.status === 'active' && (
              <div className="space-y-3">
                <label className="block text-[#94a3b8] text-sm font-medium">Suspend Reason (optional)</label>
                <input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. TOS violation, non-payment..."
                  className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleSuspend}
                  disabled={loading}
                  className="flex items-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <UserX size={16} /> {loading ? 'Suspending...' : 'Suspend Account'}
                </button>
              </div>
            )}

            {selected.status === 'suspended' && (
              <button
                onClick={handleUnsuspend}
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <UserCheck size={16} /> {loading ? 'Unsuspending...' : 'Unsuspend Account'}
              </button>
            )}

            {selected.status !== 'active' && selected.status !== 'suspended' && (
              <p className="text-[#64748b] text-sm">
                This account has status <strong className="text-[#94a3b8]">{selected.status}</strong> and cannot be suspended/unsuspended.
              </p>
            )}
          </div>
        )}

        {message && (
          <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">{message}</p>
        )}
        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
        )}
      </div>
    </div>
  )
}
