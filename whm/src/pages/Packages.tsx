import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { api } from '../api/client'

interface Package {
  id: number; name: string; diskMb: number; bandwidthMb: number
  maxDatabases: number; maxEmailAccounts: number; maxSubdomains: number
  phpVersion: string; sslEnabled: boolean
  _count?: { accounts: number }
}

const blank = {
  name: '', diskMb: 1024, bandwidthMb: 10240,
  maxDatabases: 5, maxEmailAccounts: 10, maxSubdomains: 10,
  maxAddonDomains: 5, maxParkedDomains: 5, maxFtpAccounts: 3,
  maxCronJobs: 5, phpVersion: '8.3', sslEnabled: true, backupEnabled: true,
}

export default function Packages() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Package | null>(null)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetch = async () => {
    setLoading(true)
    try { const r = await api.get('/whm/packages'); setPackages(r.data.data) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => { setEditing(null); setForm(blank); setError(''); setShowModal(true) }
  const openEdit = (p: Package) => {
    setEditing(p)
    setForm({ ...blank, ...p })
    setError('')
    setShowModal(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editing) await api.put(`/whm/packages/${editing.id}`, form)
      else await api.post('/whm/packages', form)
      setShowModal(false); fetch()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Save failed')
    } finally { setSaving(false) }
  }

  const del = async (p: Package) => {
    if (!confirm(`Delete package "${p.name}"?`)) return
    try { await api.delete(`/whm/packages/${p.id}`); fetch() }
    catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Delete failed')
    }
  }

  const field = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">Packages</h1><p className="text-[#64748b] text-sm">{packages.length} hosting plans</p></div>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-2 rounded-lg"><Plus size={16} /> New Package</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {packages.map(p => (
          <div key={p.id} className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-medium">{p.name}</h3>
                <p className="text-[#64748b] text-xs">{p._count?.accounts ?? 0} accounts</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)} className="p-1.5 text-[#64748b] hover:text-white rounded"><Pencil size={14} /></button>
                <button onClick={() => del(p)} className="p-1.5 text-[#64748b] hover:text-red-400 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Disk', p.diskMb === 0 ? 'Unlimited' : `${(p.diskMb / 1024).toFixed(0)} GB`],
                ['BW', p.bandwidthMb === 0 ? 'Unlimited' : `${(p.bandwidthMb / 1024).toFixed(0)} GB`],
                ['Databases', p.maxDatabases === 0 ? '∞' : p.maxDatabases],
                ['Emails', p.maxEmailAccounts === 0 ? '∞' : p.maxEmailAccounts],
                ['Subdomains', p.maxSubdomains === 0 ? '∞' : p.maxSubdomains],
                ['PHP', p.phpVersion],
              ].map(([l, v]) => (
                <div key={String(l)} className="flex justify-between">
                  <span className="text-[#64748b]">{l}</span>
                  <span className="text-[#94a3b8]">{v}</span>
                </div>
              ))}
            </div>
            {p.sslEnabled && <span className="mt-3 inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SSL</span>}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2d3e]">
              <h2 className="text-white font-medium">{editing ? 'Edit Package' : 'New Package'}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#64748b] hover:text-white">✕</button>
            </div>
            <form onSubmit={save} className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded">{error}</div>}
              <div><label className="block text-[#94a3b8] text-xs mb-1">Name</label>
                <input value={form.name} onChange={field('name')} required className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-indigo-500" /></div>
              {[
                ['Disk (MB)', 'diskMb'], ['Bandwidth (MB)', 'bandwidthMb'],
                ['Max Databases', 'maxDatabases'], ['Max Email Accounts', 'maxEmailAccounts'],
                ['Max Subdomains', 'maxSubdomains'], ['Max Addon Domains', 'maxAddonDomains'],
                ['Max FTP Accounts', 'maxFtpAccounts'], ['Max Cron Jobs', 'maxCronJobs'],
              ].map(([label, key]) => (
                <div key={key}><label className="block text-[#94a3b8] text-xs mb-1">{label} (0 = unlimited)</label>
                  <input type="number" min={0} value={form[key as keyof typeof form] as number} onChange={field(key as keyof typeof form)} className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-indigo-500" /></div>
              ))}
              <div><label className="block text-[#94a3b8] text-xs mb-1">PHP Version</label>
                <select value={form.phpVersion} onChange={field('phpVersion')} className="w-full bg-[#0f1117] border border-[#2a2d3e] text-[#94a3b8] text-sm rounded px-3 py-2 focus:outline-none focus:border-indigo-500">
                  {['7.4','8.0','8.1','8.2','8.3'].map(v => <option key={v} value={v}>{v}</option>)}
                </select></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-[#2a2d3e] text-[#94a3b8] text-sm py-2 rounded hover:bg-[#1e2130]">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm py-2 rounded">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
