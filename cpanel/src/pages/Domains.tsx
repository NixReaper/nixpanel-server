import React, { useEffect, useState } from 'react'
import { Globe, Plus, Trash2, RefreshCw } from 'lucide-react'
import { api } from '../api/client'

interface Item { id: number; fqdn?: string; domain?: string; subdomain?: string; documentRoot?: string }

type Tab = 'subdomains' | 'addon' | 'parked'

export default function Domains() {
  const [tab, setTab] = useState<Tab>('subdomains')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ subdomain: '', domain: '' })

  const fetch = async () => {
    setLoading(true)
    try {
      const r = await api.get(`/cpanel/domains/${tab}`)
      setItems(r.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [tab])

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (tab === 'subdomains') await api.post('/cpanel/domains/subdomains', { subdomain: form.subdomain })
      else if (tab === 'addon') await api.post('/cpanel/domains/addon', { domain: form.domain })
      else await api.post('/cpanel/domains/parked', { domain: form.domain })
      setShowModal(false); setForm({ subdomain: '', domain: '' }); fetch()
    } catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    if (!confirm('Remove this domain?')) return
    try {
      if (tab === 'subdomains') await api.delete(`/cpanel/domains/subdomains/${id}`)
      else if (tab === 'addon') await api.delete(`/cpanel/domains/addon/${id}`)
      else await api.delete(`/cpanel/domains/parked/${id}`)
      fetch()
    } catch {}
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'subdomains', label: 'Subdomains' },
    { key: 'addon', label: 'Addon Domains' },
    { key: 'parked', label: 'Parked Domains' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-semibold">Domains</h1>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#1e2d45] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white text-sm px-3 py-2 rounded-lg"><Plus size={16} /> Add</button>
        </div>
      </div>

      <div className="flex gap-1 bg-[#111827] border border-[#1e2d45] rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-1.5 text-sm rounded ${tab === t.key ? 'bg-sky-500 text-white' : 'text-[#64748b] hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#1e2d45]">
            {['Domain / FQDN', 'Document Root', ''].map(h => <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>)}
          </tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-[#1e2d45] last:border-0 hover:bg-[#1a2235]">
                <td className="px-4 py-3 text-white flex items-center gap-2"><Globe size={12} className="text-sky-400 flex-shrink-0" />{item.fqdn ?? item.domain}</td>
                <td className="px-4 py-3 text-[#64748b] font-mono text-xs">{item.documentRoot ?? '—'}</td>
                <td className="px-4 py-3"><button onClick={() => del(item.id)} className="p-1 text-[#64748b] hover:text-red-400 rounded"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan={3} className="text-center text-[#64748b] py-8">No {tab} yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#111827] border border-[#1e2d45] rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-[#1e2d45]">
              <h2 className="text-white font-medium">Add {tabs.find(t => t.key === tab)?.label.slice(0, -1)}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#64748b] hover:text-white">✕</button>
            </div>
            <form onSubmit={save} className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded">{error}</div>}
              {tab === 'subdomains' ? (
                <div><label className="block text-[#94a3b8] text-xs mb-1">Subdomain name</label>
                  <input value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} required placeholder="blog"
                    className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500" /></div>
              ) : (
                <div><label className="block text-[#94a3b8] text-xs mb-1">Domain</label>
                  <input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} required placeholder="example.com"
                    className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500" /></div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-[#1e2d45] text-[#94a3b8] text-sm py-2 rounded">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm py-2 rounded">{saving ? '...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
