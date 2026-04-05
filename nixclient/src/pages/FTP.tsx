import React, { useEffect, useState } from 'react'
import { Anchor, Plus, Trash2, RefreshCw } from 'lucide-react'
import { api } from '../api/client'

interface FtpAccount { id: number; username: string; homedir: string; quotaMb: number; status: string }

export default function FTP() {
  const [accounts, setAccounts] = useState<FtpAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', password: '', homedir: '/', quotaMb: 0 })

  const fetch = async () => {
    setLoading(true)
    try { const r = await api.get('/nixclient/ftp'); setAccounts(r.data.data) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try { await api.post('/nixclient/ftp', form); setShowModal(false); fetch() }
    catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this FTP account?')) return
    try { await api.delete(`/nixclient/ftp/${id}`); fetch() } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">FTP Accounts</h1><p className="text-[#64748b] text-sm">{accounts.length} accounts</p></div>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#1e2d45] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white text-sm px-3 py-2 rounded-lg"><Plus size={16} /> New FTP Account</button>
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#1e2d45]">
            {['Username', 'Directory', 'Quota', ''].map(h => <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>)}
          </tr></thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id} className="border-b border-[#1e2d45] last:border-0 hover:bg-[#1a2235]">
                <td className="px-4 py-3 text-white"><Anchor size={12} className="inline mr-2 text-sky-400" />{a.username}</td>
                <td className="px-4 py-3 font-mono text-[#64748b] text-xs">{a.homedir}</td>
                <td className="px-4 py-3 text-[#64748b]">{a.quotaMb === 0 ? 'Unlimited' : `${a.quotaMb} MB`}</td>
                <td className="px-4 py-3"><button onClick={() => del(a.id)} className="p-1 text-[#64748b] hover:text-red-400 rounded"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {!loading && accounts.length === 0 && <tr><td colSpan={4} className="text-center text-[#64748b] py-8">No FTP accounts</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#111827] border border-[#1e2d45] rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-[#1e2d45]">
              <h2 className="text-white font-medium">New FTP Account</h2>
              <button onClick={() => setShowModal(false)} className="text-[#64748b] hover:text-white">✕</button>
            </div>
            <form onSubmit={save} className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded">{error}</div>}
              {[['Username', 'username', 'text', 'ftpuser'], ['Password', 'password', 'password', ''], ['Directory', 'homedir', 'text', '/public_html']].map(([l, k, t, p]) => (
                <div key={k}>
                  <label className="block text-[#94a3b8] text-xs mb-1">{l}</label>
                  <input type={t} value={String(form[k as keyof typeof form])} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required={k !== 'homedir'} placeholder={p}
                    className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-[#1e2d45] text-[#94a3b8] text-sm py-2 rounded">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm py-2 rounded">{saving ? '...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
