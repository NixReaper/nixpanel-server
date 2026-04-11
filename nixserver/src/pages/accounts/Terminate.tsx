import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Trash2, AlertTriangle } from 'lucide-react'
import { api } from '../../api/client'
import AccountPicker, { type PickedAccount } from './AccountPicker'

export default function Terminate() {
  const [selected, setSelected] = useState<PickedAccount | null>(null)
  const [confirm, setConfirm] = useState('')
  const [removeFiles, setRemoveFiles] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleTerminate = async () => {
    if (!selected) return
    setLoading(true); setMessage(''); setError('')
    try {
      await api.delete(`/nixserver/accounts/${selected.id}`, { data: { removeFiles } })
      setMessage(`Account "${selected.username}" has been terminated.`)
      setSelected(null)
      setConfirm('')
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  const canTerminate = selected && confirm === selected.username

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/accounts" className="flex items-center gap-1 text-[#64748b] hover:text-white transition-colors">
          <ChevronLeft size={14} /> Accounts
        </Link>
        <span className="text-[#2a2d3e]">/</span>
        <span className="text-white">Terminate Accounts</span>
      </div>

      <div>
        <h1 className="text-white text-xl font-semibold">Terminate Accounts</h1>
        <p className="text-[#64748b] text-sm">Permanently terminate a hosting account. This action cannot be undone.</p>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-5 space-y-4">
        <AccountPicker onSelect={acc => { setSelected(acc); setConfirm('') }} selected={selected} />

        {selected && (
          <div className="space-y-4 pt-2 border-t border-[#2a2d3e]">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-red-400 text-sm font-medium">Warning: Irreversible Action</p>
                <p className="text-[#94a3b8] text-xs">
                  Terminating <strong>{selected.username}</strong> will permanently delete the account, DNS zones, email accounts, databases, and SSL certificates.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={removeFiles}
                onChange={e => setRemoveFiles(e.target.checked)}
                className="w-4 h-4 rounded border-[#2a2d3e] bg-[#0f1117] accent-red-500"
              />
              <span className="text-[#94a3b8] text-sm">Also delete home directory files</span>
            </label>

            <div className="space-y-2">
              <label className="block text-[#94a3b8] text-sm">
                Type <strong className="text-white">{selected.username}</strong> to confirm
              </label>
              <input
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder={selected.username}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              onClick={handleTerminate}
              disabled={!canTerminate || loading}
              className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} /> {loading ? 'Terminating...' : 'Terminate Account'}
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
