import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Network } from 'lucide-react'
import { api } from '../../api/client'
import AccountPicker, { type PickedAccount } from './AccountPicker'

export default function ChangeIP() {
  const [selected, setSelected] = useState<PickedAccount | null>(null)
  const [ipAddress, setIpAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSelect = (acc: PickedAccount) => {
    setSelected(acc)
    setIpAddress(acc.ipAddress ?? '')
    setMessage('')
    setError('')
  }

  const handleSubmit = async () => {
    if (!selected || !ipAddress.trim()) return
    setLoading(true); setMessage(''); setError('')
    try {
      await api.post(`/nixserver/accounts/${selected.id}/change-ip`, { ipAddress: ipAddress.trim() })
      setMessage(`IP address for "${selected.username}" updated to ${ipAddress.trim()}.`)
      setSelected(prev => prev ? { ...prev, ipAddress: ipAddress.trim() } : null)
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
        <span className="text-white">Change Site's IP Address</span>
      </div>

      <div>
        <h1 className="text-white text-xl font-semibold">Change Site's IP Address</h1>
        <p className="text-[#64748b] text-sm">Assign a different IP address to a hosting account.</p>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-5 space-y-4">
        <AccountPicker onSelect={handleSelect} selected={selected} />

        {selected && (
          <div className="space-y-4 pt-2 border-t border-[#2a2d3e]">
            <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-3">
              <p className="text-[#64748b] text-xs mb-1">Current IP Address</p>
              <p className="text-white font-mono">{selected.ipAddress ?? 'Not assigned'}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[#94a3b8] text-sm font-medium">New IP Address</label>
              <input
                type="text"
                value={ipAddress}
                onChange={e => setIpAddress(e.target.value)}
                placeholder="e.g. 192.168.1.100"
                className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !ipAddress.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Network size={16} /> {loading ? 'Updating...' : 'Update IP Address'}
            </button>
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
