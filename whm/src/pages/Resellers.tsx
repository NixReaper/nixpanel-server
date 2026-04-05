import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Search, RefreshCw, UserX, UserCheck, Trash2 } from 'lucide-react'
import { api } from '../api/client'

interface Reseller { id: number; username: string; email: string; company: string | null; status: string; _count?: { accounts: number } }

export default function Resellers() {
  const [items, setItems] = useState<Reseller[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', password: '', email: '', company: '', maxAccounts: 10, diskLimitMb: 51200, bandwidthLimitMb: 512000 })

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const r = await api.get(`/whm/resellers${params}`)
      setItems(r.data.data.items ?? r.data.data)
    } finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetch() }, [fetch])

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try { await api.post('/whm/resellers', form); setShowModal(false); fetch() }
    catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
    finally { setSaving(false) }
  }

  const act = async (id: number, action: 'suspend' | 'unsuspend' | 'delete') => {
    if (action === 'delete' && !confirm('Delete this reseller?')) return
    try {
      if (action === 'suspend') await api.post(`/whm/resellers/${id}/suspend`)
      else if (action === 'unsuspend') await api.post(`/whm/resellers/${id}/unsuspend`)
      else await api.delete(`/whm/resellers/${id}`)
      fetch()
    } catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">Resellers</h1><p className="text-[#64748b] text-sm">{items.length} resellers</p></div>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-2 rounded-lg"><Plus size={16} /> New Reseller</button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resellers..." className="w-full bg-[#1a1d27] border border-[#2a2d3e] text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500" />
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#2a2d3e]">
            {['Username', 'Email', 'Company', 'Accounts', 'Status', ''].map(h => <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>)}
          </tr></thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130]">
                <td className="px-4 py-3 text-white">{r.username}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{r.email}</td>
                <td className="px-4 py-3 text-[#64748b]">{r.company ?? '—'}</td>
                <td className="px-4 py-3 text-[#64748b]">{r._count?.accounts ?? 0}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${r.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{r.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {r.status === 'active'
                      ? <button onClick={() => act(r.id, 'suspend')} className="p-1 text-[#64748b] hover:text-amber-400 rounded"><UserX size={14} /></button>
                      : <button onClick={() => act(r.id, 'unsuspend')} className="p-1 text-[#64748b] hover:text-emerald-400 rounded"><UserCheck size={14} /></button>}
                    <button onClick={() => act(r.id, 'delete')} className="p-1 text-[#64748b] hover:text-red-400 rounded"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="text-center text-[#64748b] py-8">No resellers</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2d3e]">
              <h2 className="text-white font-medium">New Reseller</h2>
              <button onClick={() => setShowModal(false)} className="text-[#64748b] hover:text-white">✕</button>
            </div>
            <form onSubmit={save} className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded">{error}</div>}
              {[['Username', 'username', 'text'], ['Password', 'password', 'password'], ['Email', 'email', 'email'], ['Company', 'company', 'text']].map(([label, key, type]) => (
                <div key={key}><label className="block text-[#94a3b8] text-xs mb-1">{label}</label>
                  <input type={type} value={form[key as keyof typeof form] as string} required={key !== 'company'}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-indigo-500" /></div>
              ))}
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
