import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Terminal, ShieldCheck, ShieldOff } from 'lucide-react'
import { api } from '../../api/client'
import AccountPicker, { type PickedAccount } from './AccountPicker'

export default function ShellAccess() {
  const [selected, setSelected] = useState<PickedAccount | null>(null)
  const [shell, setShell] = useState<string>('/usr/sbin/nologin')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSelect = async (acc: PickedAccount) => {
    setSelected(acc); setMessage(''); setError('')
    try {
      const r = await api.get(`/nixserver/accounts/${acc.id}`)
      setShell(r.data.data.shell ?? '/usr/sbin/nologin')
    } catch {
      setShell('/usr/sbin/nologin')
    }
  }

  const toggle = async (enable: boolean) => {
    if (!selected) return
    setLoading(true); setMessage(''); setError('')
    try {
      const r = await api.put(`/nixserver/accounts/${selected.id}/shell`, { enabled: enable })
      setShell(r.data.data.shell)
      setMessage(enable
        ? `Shell access enabled for "${selected.username}".`
        : `Shell access disabled for "${selected.username}".`)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Action failed')
    } finally { setLoading(false) }
  }

  const hasShell = shell === '/bin/bash' || shell === '/bin/sh'

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/accounts" className="flex items-center gap-1 text-[#64748b] hover:text-white transition-colors">
          <ChevronLeft size={14} /> Accounts
        </Link>
        <span className="text-[#2a2d3e]">/</span>
        <span className="text-white">Manage Shell Access</span>
      </div>

      <div>
        <h1 className="text-white text-xl font-semibold">Manage Shell Access</h1>
        <p className="text-[#64748b] text-sm">Grant or revoke SSH shell access for hosting accounts.</p>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-5 space-y-4">
        <AccountPicker onSelect={handleSelect} selected={selected} />

        {selected && (
          <div className="space-y-4 pt-2 border-t border-[#2a2d3e]">
            <div className="flex items-center gap-3 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-3">
              <Terminal size={16} className={hasShell ? 'text-emerald-400' : 'text-[#64748b]'} />
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{selected.username}</p>
                <p className="text-[#64748b] text-xs font-mono mt-0.5">shell: {shell}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${hasShell
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-[#1a2235] text-[#64748b] border-[#2a2d3e]'}`}>
                {hasShell ? 'Shell enabled' : 'No shell'}
              </span>
            </div>

            {hasShell ? (
              <div className="space-y-3">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-amber-400 text-xs">
                  This account has SSH access via <span className="font-mono">{shell}</span>. Disabling sets shell to <span className="font-mono">/usr/sbin/nologin</span>.
                </div>
                <button
                  onClick={() => toggle(false)}
                  disabled={loading}
                  className="flex items-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ShieldOff size={16} /> {loading ? 'Disabling...' : 'Disable Shell Access'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-lg px-4 py-3 text-[#64748b] text-xs">
                  No shell access. Enabling will set the shell to <span className="font-mono">/bin/bash</span>.
                </div>
                <button
                  onClick={() => toggle(true)}
                  disabled={loading}
                  className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ShieldCheck size={16} /> {loading ? 'Enabling...' : 'Enable Shell Access'}
                </button>
              </div>
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
