import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, FileText, RefreshCw } from 'lucide-react'
import { api } from '../../api/client'
import AccountPicker, { type PickedAccount } from './AccountPicker'

export default function ApacheLogs() {
  const [selected, setSelected] = useState<PickedAccount | null>(null)
  const [logType, setLogType] = useState<'access' | 'error'>('access')
  const [lines, setLines] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchLogs = async (username: string, type: 'access' | 'error') => {
    setLoading(true); setError('')
    try {
      const r = await api.get(`/nixserver/webserver/accounts/${username}/logs/${type}`)
      setLines(r.data.data.lines ?? [])
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to load logs')
      setLines([])
    } finally { setLoading(false) }
  }

  const handleSelect = (acc: PickedAccount) => {
    setSelected(acc)
    setLines([])
    setError('')
    fetchLogs(acc.username, logType)
  }

  const handleTabChange = (type: 'access' | 'error') => {
    setLogType(type)
    if (selected) fetchLogs(selected.username, type)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/accounts" className="flex items-center gap-1 text-[#64748b] hover:text-white transition-colors">
          <ChevronLeft size={14} /> Accounts
        </Link>
        <span className="text-[#2a2d3e]">/</span>
        <span className="text-white">Apache Log Viewer</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">Apache Log Viewer</h1>
          <p className="text-[#64748b] text-sm">View Apache access and error logs per hosting account.</p>
        </div>
        {selected && (
          <button
            onClick={() => fetchLogs(selected.username, logType)}
            className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-5 space-y-4">
        <AccountPicker onSelect={handleSelect} selected={selected} />

        {selected && (
          <div className="space-y-3 pt-2 border-t border-[#2a2d3e]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-indigo-400" />
                <span className="text-[#94a3b8] text-sm font-mono">/home/{selected.username}/logs/</span>
              </div>
              <div className="flex gap-1 bg-[#0f1117] border border-[#2a2d3e] rounded-lg p-0.5">
                {(['access', 'error'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => handleTabChange(t)}
                    className={`px-3 py-1 text-xs rounded ${logType === t ? 'bg-indigo-600 text-white' : 'text-[#64748b] hover:text-white'}`}
                  >
                    {t}.log
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded">
                {error}
              </div>
            )}

            <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-xl overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32 text-[#64748b] text-sm">Loading logs...</div>
                ) : lines.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-[#64748b] text-sm">No log entries found</div>
                ) : (
                  <pre className="p-4 text-xs text-[#64748b] font-mono leading-relaxed whitespace-pre-wrap">
                    {lines.join('\n')}
                  </pre>
                )}
              </div>
              {lines.length > 0 && (
                <div className="border-t border-[#2a2d3e] px-4 py-2 text-xs text-[#64748b]">
                  Showing last {lines.length} lines
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
