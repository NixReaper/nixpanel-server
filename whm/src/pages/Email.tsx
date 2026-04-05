import React, { useEffect, useState } from 'react'
import { Mail, Plus, Trash2, RefreshCw } from 'lucide-react'
import { api } from '../api/client'

interface EmailAccount { id: number; address: string; domain: string; quotaMb: number; usedMb: number; status: string }

export default function Email() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hosting, setHosting] = useState<{ id: number; username: string; domain: string }[]>([])
  const [form, setForm] = useState({ accountId: '', username: '', password: '', quotaMb: 500 })

  const fetch = async () => {
    setLoading(true)
    try {
      const [em, acc] = await Promise.all([api.get('/whm/email'), api.get('/whm/accounts?limit=100')])
      setAccounts(em.data.data)
      setHosting(acc.data.data.items)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await api.post('/whm/email', { ...form, accountId: parseInt(form.accountId, 10), quotaMb: form.quotaMb })
      setShowModal(false); fetch()
    } catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
    finally { setSaving(false) }
  }

  const del = async (id: number, address: string) => {
    if (!confirm(`Delete ${address}?`)) return
    try { await api.delete(`/whm/email/${id}`); fetch() }
    catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">Email Accounts</h1><p className="text-[#64748b] text-sm">{accounts.length} accounts</p></div>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-2 rounded-lg"><Plus size={16} /> New Email</button>
        </div>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#2a2d3e]">
            {['Address', 'Quota', 'Used', 'Status', ''].map(h => <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>)}
          </tr></thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130]">
                <td className="px-4 py-3 text-white">{a.address}</td>
                <td className="px-4 py-3 text-[#64748b]">{a.quotaMb} MB</td>
                <td className="px-4 py-3 text-[#64748b]">{a.usedMb} MB</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${a.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{a.status}</span></td>
                <td className="px-4 py-3"><button onClick={() => del(a.id, a.address)} className="p-1 text-[#64748b] hover:text-red-400 rounded"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {!loading && accounts.length === 0 && <tr><td colSpan={5} className="text-center text-[#64748b] py-8">No email accounts</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2d3e]">
              <h2 className="text-white font-medium">New Email Account</h2>
              <button onClick={() => setShowModal(false)} className="text-[#64748b] hover:text-white">✕</button>
            </div>
            <form onSubmit={save} className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded">{error}</div>}
              <div><label className="block text-[#94a3b8] text-xs mb-1">Account</label>
                <select value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))} required className="w-full bg-[#0f1117] border border-[#2a2d3e] text-[#94a3b8] text-sm rounded px-3 py-2 focus:outline-none focus:border-indigo-500">
                  <option value="">Select account...</option>
                  {hosting.map(h => <option key={h.id} value={h.id}>{h.username} ({h.domain})</option>)}
                </select></div>
              <div><label className="block text-[#94a3b8] text-xs mb-1">Username</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required placeholder="info" className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-indigo-500" /></div>
              <div><label className="block text-[#94a3b8] text-xs mb-1">Password</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-indigo-500" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-[#2a2d3e] text-[#94a3b8] text-sm py-2 rounded hover:bg-[#1e2130]">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm py-2 rounded">{saving ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
