import React, { useEffect, useState } from 'react'
import { Lock, Plus, RefreshCw, RotateCcw, XCircle } from 'lucide-react'
import { api } from '../api/client'

interface Cert { id: number; domain: string; type: string; status: string; issuedAt: string | null; expiresAt: string | null; account: { username: string } }

const statusColor: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  expired: 'bg-red-500/10 text-red-400 border-red-500/20',
  revoked: 'bg-[#1e2130] text-[#64748b] border-[#2a2d3e]',
}

export default function SSL() {
  const [certs, setCerts] = useState<Cert[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hosting, setHosting] = useState<{ id: number; username: string; domain: string }[]>([])
  const [form, setForm] = useState({ accountId: '', domain: '', includeWww: true, autoRenew: true })

  const fetch = async () => {
    setLoading(true)
    try {
      const [sl, acc] = await Promise.all([api.get('/whm/ssl'), api.get('/whm/accounts?limit=100')])
      setCerts(sl.data.data)
      setHosting(acc.data.data.items)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const issue = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await api.post('/whm/ssl/issue', { ...form, accountId: parseInt(form.accountId, 10) })
      setShowModal(false); fetch()
    } catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
    finally { setSaving(false) }
  }

  const renew = async (id: number) => {
    try { await api.post(`/whm/ssl/${id}/renew`); fetch() }
    catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Renewal failed') }
  }

  const revoke = async (id: number) => {
    if (!confirm('Revoke this certificate?')) return
    try { await api.post(`/whm/ssl/${id}/revoke`); fetch() }
    catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Revoke failed') }
  }

  const daysUntil = (date: string | null) => {
    if (!date) return null
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
    return days
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">SSL Certificates</h1><p className="text-[#64748b] text-sm">{certs.length} certificates</p></div>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-2 rounded-lg"><Plus size={16} /> Issue Cert</button>
        </div>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#2a2d3e]">
            {['Domain', 'Account', 'Status', 'Expires', 'Actions'].map(h => <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>)}
          </tr></thead>
          <tbody>
            {certs.map(c => {
              const days = daysUntil(c.expiresAt)
              return (
                <tr key={c.id} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130]">
                  <td className="px-4 py-3 text-white flex items-center gap-2"><Lock size={12} className="text-emerald-400 flex-shrink-0" />{c.domain}</td>
                  <td className="px-4 py-3 text-[#64748b]">{c.account.username}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[c.status] ?? ''}`}>{c.status}</span></td>
                  <td className="px-4 py-3 text-xs">
                    {c.expiresAt ? (
                      <span className={days !== null && days < 14 ? 'text-red-400' : days !== null && days < 30 ? 'text-amber-400' : 'text-[#64748b]'}>
                        {days !== null && days > 0 ? `${days}d` : 'Expired'} · {new Date(c.expiresAt).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {c.status === 'active' && <button onClick={() => renew(c.id)} className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-400 hover:bg-indigo-600/10 rounded border border-indigo-500/20"><RotateCcw size={12} /> Renew</button>}
                      {c.status !== 'revoked' && <button onClick={() => revoke(c.id)} className="p-1 text-[#64748b] hover:text-red-400 rounded"><XCircle size={14} /></button>}
                    </div>
                  </td>
                </tr>
              )
            })}
            {!loading && certs.length === 0 && <tr><td colSpan={5} className="text-center text-[#64748b] py-8">No certificates</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2d3e]">
              <h2 className="text-white font-medium">Issue SSL Certificate</h2>
              <button onClick={() => setShowModal(false)} className="text-[#64748b] hover:text-white">✕</button>
            </div>
            <form onSubmit={issue} className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded">{error}</div>}
              <div><label className="block text-[#94a3b8] text-xs mb-1">Account</label>
                <select value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value, domain: hosting.find(h => h.id === parseInt(e.target.value, 10))?.domain ?? '' }))} required className="w-full bg-[#0f1117] border border-[#2a2d3e] text-[#94a3b8] text-sm rounded px-3 py-2 focus:outline-none focus:border-indigo-500">
                  <option value="">Select account...</option>
                  {hosting.map(h => <option key={h.id} value={h.id}>{h.username} ({h.domain})</option>)}
                </select></div>
              <div><label className="block text-[#94a3b8] text-xs mb-1">Domain</label>
                <input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} required className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-indigo-500" /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.includeWww} onChange={e => setForm(f => ({ ...f, includeWww: e.target.checked }))} className="accent-indigo-500" />
                <span className="text-[#94a3b8] text-xs">Include www. variant</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-[#2a2d3e] text-[#94a3b8] text-sm py-2 rounded hover:bg-[#1e2130]">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm py-2 rounded">{saving ? 'Issuing...' : 'Issue'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
