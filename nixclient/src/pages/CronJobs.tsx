import React, { useEffect, useState } from 'react'
import { Clock, Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react'
import { api } from '../api/client'

interface CronJob { id: number; schedule: string; command: string; comment: string | null; enabled: boolean }

const PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Weekly (Sunday)', value: '0 0 * * 0' },
  { label: 'Monthly (1st)', value: '0 0 1 * *' },
]

export default function CronJobs() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ schedule: '0 * * * *', command: '', comment: '', enabled: true })

  const fetch = async () => {
    setLoading(true)
    try { const r = await api.get('/nixclient/cron'); setJobs(r.data.data) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try { await api.post('/nixclient/cron', form); setShowModal(false); setForm({ schedule: '0 * * * *', command: '', comment: '', enabled: true }); fetch() }
    catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this cron job?')) return
    try { await api.delete(`/nixclient/cron/${id}`); fetch() } catch {}
  }

  const toggle = async (job: CronJob) => {
    try { await api.put(`/nixclient/cron/${job.id}`, { enabled: !job.enabled }); fetch() } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">Cron Jobs</h1><p className="text-[#64748b] text-sm">{jobs.length} jobs</p></div>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#1e2d45] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white text-sm px-3 py-2 rounded-lg"><Plus size={16} /> New Job</button>
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#1e2d45]">
            {['Schedule', 'Command', 'Comment', 'Status', ''].map(h => <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>)}
          </tr></thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.id} className={`border-b border-[#1e2d45] last:border-0 hover:bg-[#1a2235] ${!j.enabled ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-mono text-sky-400 text-xs whitespace-nowrap">{j.schedule}</td>
                <td className="px-4 py-3 font-mono text-[#94a3b8] text-xs max-w-xs truncate">{j.command}</td>
                <td className="px-4 py-3 text-[#64748b] text-xs">{j.comment ?? '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(j)} className="text-[#64748b] hover:text-white">
                    {j.enabled ? <ToggleRight size={18} className="text-sky-400" /> : <ToggleLeft size={18} />}
                  </button>
                </td>
                <td className="px-4 py-3"><button onClick={() => del(j.id)} className="p-1 text-[#64748b] hover:text-red-400 rounded"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {!loading && jobs.length === 0 && <tr><td colSpan={5} className="text-center text-[#64748b] py-8">No cron jobs</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#111827] border border-[#1e2d45] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[#1e2d45]">
              <h2 className="text-white font-medium">New Cron Job</h2>
              <button onClick={() => setShowModal(false)} className="text-[#64748b] hover:text-white">✕</button>
            </div>
            <form onSubmit={save} className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded">{error}</div>}
              <div>
                <label className="block text-[#94a3b8] text-xs mb-1">Preset</label>
                <select onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-[#94a3b8] text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500">
                  {PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  <option value="custom">Custom...</option>
                </select>
              </div>
              <div>
                <label className="block text-[#94a3b8] text-xs mb-1">Schedule (cron expression)</label>
                <input value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} required placeholder="* * * * *"
                  className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white font-mono text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500" />
                <p className="text-[#64748b] text-xs mt-1">minute hour day month weekday</p>
              </div>
              <div>
                <label className="block text-[#94a3b8] text-xs mb-1">Command</label>
                <input value={form.command} onChange={e => setForm(f => ({ ...f, command: e.target.value }))} required placeholder="/usr/bin/php /home/user/public_html/cron.php"
                  className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white font-mono text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-[#94a3b8] text-xs mb-1">Comment (optional)</label>
                <input value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} placeholder="What this job does"
                  className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-[#1e2d45] text-[#94a3b8] text-sm py-2 rounded">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm py-2 rounded">{saving ? 'Saving...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
