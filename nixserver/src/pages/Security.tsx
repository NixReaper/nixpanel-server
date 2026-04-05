import React, { useEffect, useState } from 'react'
import { Shield, Plus, Trash2, CheckCircle } from 'lucide-react'
import { api } from '../api/client'

interface BlockedIp { id: number; ip: string; reason: string | null; createdAt: string }
interface SecurityEvent { id: number; type: string; severity: string; message: string; sourceIp: string | null; resolved: boolean; createdAt: string }

const severityColor: Record<string, string> = {
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
}

export default function Security() {
  const [blocked, setBlocked] = useState<BlockedIp[]>([])
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [newIp, setNewIp] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const [b, e] = await Promise.all([
        api.get('/nixserver/security/blocked-ips'),
        api.get('/nixserver/security/events'),
      ])
      setBlocked(b.data.data)
      setEvents(e.data.data.items ?? e.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const block = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await api.post('/nixserver/security/blocked-ips', { ip: newIp, reason }); setNewIp(''); setReason(''); fetch() }
    catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
  }

  const unblock = async (id: number) => {
    try { await api.delete(`/nixserver/security/blocked-ips/${id}`); fetch() }
    catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
  }

  const resolve = async (id: number) => {
    try { await api.post(`/nixserver/security/events/${id}/resolve`); fetch() }
    catch {}
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-white text-xl font-semibold">Security</h1><p className="text-[#64748b] text-sm">IP blocking, events, and Fail2Ban</p></div>

      {/* Block IP */}
      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
        <h2 className="text-white text-sm font-medium mb-3">Block IP Address</h2>
        <form onSubmit={block} className="flex gap-3">
          <input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="192.168.1.1" required
            className="bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2 w-48 focus:outline-none focus:border-indigo-500" />
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)"
            className="bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2 flex-1 focus:outline-none focus:border-indigo-500" />
          <button type="submit" className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-sm px-3 py-2 rounded-lg">
            <Plus size={14} /> Block
          </button>
        </form>
      </div>

      {/* Blocked IPs */}
      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2d3e]"><h2 className="text-white text-sm font-medium">Blocked IPs ({blocked.length})</h2></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#2a2d3e]">
            {['IP', 'Reason', 'Blocked', ''].map(h => <th key={h} className="text-left text-[#64748b] font-medium px-4 py-2 text-xs">{h}</th>)}
          </tr></thead>
          <tbody>
            {blocked.map(b => (
              <tr key={b.id} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130]">
                <td className="px-4 py-2 font-mono text-red-400 text-xs">{b.ip}</td>
                <td className="px-4 py-2 text-[#64748b] text-xs">{b.reason ?? '—'}</td>
                <td className="px-4 py-2 text-[#64748b] text-xs">{new Date(b.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2"><button onClick={() => unblock(b.id)} className="p-1 text-[#64748b] hover:text-red-400 rounded"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {blocked.length === 0 && <tr><td colSpan={4} className="text-center text-[#64748b] py-6 text-sm">No blocked IPs</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Security Events */}
      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2d3e]"><h2 className="text-white text-sm font-medium">Security Events</h2></div>
        <div className="divide-y divide-[#2a2d3e]">
          {events.slice(0, 20).map(ev => (
            <div key={ev.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-[#1e2130] ${ev.resolved ? 'opacity-50' : ''}`}>
              <span className={`text-xs px-2 py-0.5 rounded-full border mt-0.5 flex-shrink-0 ${severityColor[ev.severity] ?? ''}`}>{ev.severity}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[#94a3b8] text-xs">{ev.message}</p>
                <p className="text-[#64748b] text-xs mt-0.5">{ev.sourceIp && <span className="font-mono">{ev.sourceIp} · </span>}{new Date(ev.createdAt).toLocaleString()}</p>
              </div>
              {!ev.resolved && (
                <button onClick={() => resolve(ev.id)} className="flex-shrink-0 p-1 text-[#64748b] hover:text-emerald-400 rounded"><CheckCircle size={14} /></button>
              )}
            </div>
          ))}
          {events.length === 0 && <div className="text-center text-[#64748b] py-6 text-sm">No security events</div>}
        </div>
      </div>
    </div>
  )
}
