import React, { useEffect, useState } from 'react'
import { Mail, Plus, Trash2, RefreshCw, ArrowRight } from 'lucide-react'
import { api } from '../api/client'

interface EmailAccount { id: number; address: string; quotaMb: number; usedMb: number; status: string }
interface Forwarder { id: number; source: string; destination: string }

export default function Email() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [forwarders, setForwarders] = useState<Forwarder[]>([])
  const [tab, setTab] = useState<'accounts' | 'forwarders'>('accounts')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showFwd, setShowFwd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', password: '', quotaMb: 500 })
  const [fwdForm, setFwdForm] = useState({ source: '', destination: '' })

  const fetch = async () => {
    setLoading(true)
    try {
      const [em, fw] = await Promise.all([api.get('/cpanel/email'), api.get('/cpanel/email/forwarders')])
      setAccounts(em.data.data)
      setForwarders(fw.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await api.post('/cpanel/email', form)
      setShowModal(false); fetch()
    } catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this email account?')) return
    try { await api.delete(`/cpanel/email/${id}`); fetch() } catch {}
  }

  const addForwarder = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try { await api.post('/cpanel/email/forwarders', fwdForm); setShowFwd(false); fetch() }
    catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
    finally { setSaving(false) }
  }

  const delFwd = async (id: number) => {
    try { await api.delete(`/cpanel/email/forwarders/${id}`); fetch() } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-semibold">Email</h1>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#1e2d45] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          {tab === 'accounts'
            ? <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white text-sm px-3 py-2 rounded-lg"><Plus size={16} /> New Account</button>
            : <button onClick={() => setShowFwd(true)} className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white text-sm px-3 py-2 rounded-lg"><Plus size={16} /> New Forwarder</button>}
        </div>
      </div>

      <div className="flex gap-1 bg-[#111827] border border-[#1e2d45] rounded-lg p-1 w-fit">
        {(['accounts', 'forwarders'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm rounded ${tab === t ? 'bg-sky-500 text-white' : 'text-[#64748b] hover:text-white'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'accounts' ? (
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#1e2d45]">
              {['Address', 'Quota', 'Used', ''].map(h => <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>)}
            </tr></thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id} className="border-b border-[#1e2d45] last:border-0 hover:bg-[#1a2235]">
                  <td className="px-4 py-3 text-white"><Mail size={12} className="inline mr-2 text-sky-400" />{a.address}</td>
                  <td className="px-4 py-3 text-[#64748b]">{a.quotaMb} MB</td>
                  <td className="px-4 py-3 text-[#64748b]">{a.usedMb} MB</td>
                  <td className="px-4 py-3"><button onClick={() => del(a.id)} className="p-1 text-[#64748b] hover:text-red-400 rounded"><Trash2 size={14} /></button></td>
                </tr>
              ))}
              {!loading && accounts.length === 0 && <tr><td colSpan={4} className="text-center text-[#64748b] py-8">No email accounts</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#1e2d45]">
              {['Source', '', 'Destination', ''].map((h, i) => <th key={i} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>)}
            </tr></thead>
            <tbody>
              {forwarders.map(f => (
                <tr key={f.id} className="border-b border-[#1e2d45] last:border-0 hover:bg-[#1a2235]">
                  <td className="px-4 py-3 text-[#94a3b8]">{f.source}</td>
                  <td className="px-4 py-3"><ArrowRight size={12} className="text-[#64748b]" /></td>
                  <td className="px-4 py-3 text-white">{f.destination}</td>
                  <td className="px-4 py-3"><button onClick={() => delFwd(f.id)} className="p-1 text-[#64748b] hover:text-red-400 rounded"><Trash2 size={14} /></button></td>
                </tr>
              ))}
              {!loading && forwarders.length === 0 && <tr><td colSpan={4} className="text-center text-[#64748b] py-8">No forwarders</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {(showModal || showFwd) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#111827] border border-[#1e2d45] rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-[#1e2d45]">
              <h2 className="text-white font-medium">{showModal ? 'New Email Account' : 'New Forwarder'}</h2>
              <button onClick={() => { setShowModal(false); setShowFwd(false) }} className="text-[#64748b] hover:text-white">✕</button>
            </div>
            {showModal ? (
              <form onSubmit={createAccount} className="p-4 space-y-3">
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded">{error}</div>}
                <div><label className="block text-[#94a3b8] text-xs mb-1">Username</label>
                  <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required placeholder="info"
                    className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500" /></div>
                <div><label className="block text-[#94a3b8] text-xs mb-1">Password</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required
                    className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500" /></div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-[#1e2d45] text-[#94a3b8] text-sm py-2 rounded">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm py-2 rounded">{saving ? '...' : 'Create'}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={addForwarder} className="p-4 space-y-3">
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded">{error}</div>}
                <div><label className="block text-[#94a3b8] text-xs mb-1">Source</label>
                  <input value={fwdForm.source} onChange={e => setFwdForm(f => ({ ...f, source: e.target.value }))} required placeholder="from@domain.com"
                    className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500" /></div>
                <div><label className="block text-[#94a3b8] text-xs mb-1">Destination</label>
                  <input value={fwdForm.destination} onChange={e => setFwdForm(f => ({ ...f, destination: e.target.value }))} required placeholder="to@example.com"
                    className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500" /></div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowFwd(false)} className="flex-1 border border-[#1e2d45] text-[#94a3b8] text-sm py-2 rounded">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm py-2 rounded">{saving ? '...' : 'Add'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
