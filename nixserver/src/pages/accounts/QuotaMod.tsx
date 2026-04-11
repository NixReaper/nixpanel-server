import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, HardDrive } from 'lucide-react'
import { api } from '../../api/client'
import AccountPicker, { type PickedAccount } from './AccountPicker'

export default function QuotaMod() {
  const [selected, setSelected] = useState<PickedAccount | null>(null)
  const [fullAccount, setFullAccount] = useState<{ diskUsedMb: number; package?: { diskMb: number; bandwidthMb: number } } | null>(null)
  const [diskMb, setDiskMb] = useState('')
  const [bandwidthMb, setBandwidthMb] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSelect = async (acc: PickedAccount) => {
    setSelected(acc)
    setMessage(''); setError('')
    try {
      const r = await api.get(`/nixserver/accounts/${acc.id}`)
      const data = r.data.data
      setFullAccount(data)
      setDiskMb(String(data.package?.diskMb ?? ''))
      setBandwidthMb(String(data.package?.bandwidthMb ?? ''))
    } catch {
      setFullAccount(null)
      setDiskMb('')
      setBandwidthMb('')
    }
  }

  const handleSubmit = async () => {
    if (!selected) return
    const d = parseInt(diskMb, 10)
    const b = parseInt(bandwidthMb, 10)
    if (!d || !b || d <= 0 || b <= 0) { setError('Enter valid positive values for both fields'); return }
    setLoading(true); setMessage(''); setError('')
    try {
      await api.put(`/nixserver/accounts/${selected.id}/quota`, { diskMb: d, bandwidthMb: b })
      setMessage(`Quota updated for "${selected.username}".`)
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
        <span className="text-white">Quota Modification</span>
      </div>

      <div>
        <h1 className="text-white text-xl font-semibold">Quota Modification</h1>
        <p className="text-[#64748b] text-sm">Adjust disk and bandwidth quotas for a hosting account.</p>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-5 space-y-4">
        <AccountPicker onSelect={handleSelect} selected={selected} />

        {selected && (
          <div className="space-y-4 pt-2 border-t border-[#2a2d3e]">
            {fullAccount && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-3">
                  <p className="text-[#64748b] text-xs mb-1">Disk Used</p>
                  <p className="text-white font-mono text-sm">{fullAccount.diskUsedMb?.toLocaleString() ?? 0} MB</p>
                </div>
                <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-3">
                  <p className="text-[#64748b] text-xs mb-1">Current Package</p>
                  <p className="text-white text-sm">{selected.package?.name ?? 'None'}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[#94a3b8] text-sm font-medium">Disk Limit (MB)</label>
                <input
                  type="number"
                  value={diskMb}
                  onChange={e => setDiskMb(e.target.value)}
                  min="1"
                  placeholder="e.g. 10240"
                  className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[#94a3b8] text-sm font-medium">Bandwidth Limit (MB)</label>
                <input
                  type="number"
                  value={bandwidthMb}
                  onChange={e => setBandwidthMb(e.target.value)}
                  min="1"
                  placeholder="e.g. 102400"
                  className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <p className="text-[#64748b] text-xs">
              Note: This will update the quota on the account's associated package.
            </p>

            <button
              onClick={handleSubmit}
              disabled={loading || !diskMb || !bandwidthMb}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <HardDrive size={16} /> {loading ? 'Updating...' : 'Update Quota'}
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
