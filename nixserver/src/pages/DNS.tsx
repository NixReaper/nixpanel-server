import { useEffect, useState } from 'react'
import { RefreshCw, Globe, Plus, Trash2 } from 'lucide-react'
import { api } from '../api/client'

interface Zone { id: number; domain: string; status: string; account: { username: string }; _count: { records: number } }
interface Record_ { id: number; type: string; name: string; value: string; ttl: number; priority: number | null }

export default function DNS() {
  const [zones, setZones] = useState<Zone[]>([])
  const [selected, setSelected] = useState<Zone | null>(null)
  const [records, setRecords] = useState<Record_[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'A', name: '@', value: '', ttl: 3600, priority: '' })
  const [saving, setSaving] = useState(false)

  const fetchZones = async () => {
    setLoading(true)
    try { const r = await api.get('/nixserver/dns'); setZones(r.data.data) }
    finally { setLoading(false) }
  }

  const loadZone = async (zone: Zone) => {
    setSelected(zone)
    const r = await api.get(`/nixserver/dns/${zone.id}`)
    setRecords(r.data.data.records ?? [])
  }

  useEffect(() => { fetchZones() }, [])

  const addRecord = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return
    setSaving(true)
    try {
      await api.post(`/nixserver/dns/${selected.id}/records`, { ...form, priority: form.priority ? parseInt(form.priority, 10) : undefined })
      setShowForm(false)
      loadZone(selected)
    } catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
    finally { setSaving(false) }
  }

  const deleteRecord = async (recordId: number) => {
    if (!selected || !confirm('Delete this DNS record?')) return
    try { await api.delete(`/nixserver/dns/${selected.id}/records/${recordId}`); loadZone(selected) }
    catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">DNS</h1><p className="text-[#64748b] text-sm">{zones.length} zones</p></div>
        <button onClick={fetchZones} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Zone list */}
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a2d3e]"><h2 className="text-white text-sm font-medium">Zones</h2></div>
          <div className="divide-y divide-[#2a2d3e]">
            {zones.map(z => (
              <button key={z.id} onClick={() => loadZone(z)} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1e2130] text-left transition-colors ${selected?.id === z.id ? 'bg-indigo-600/10' : ''}`}>
                <Globe size={14} className="text-[#64748b] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{z.domain}</p>
                  <p className="text-[#64748b] text-xs">{z.account.username} · {z._count.records} records</p>
                </div>
              </button>
            ))}
            {zones.length === 0 && <div className="text-center text-[#64748b] py-6 text-sm">No zones</div>}
          </div>
        </div>

        {/* Records */}
        <div className="lg:col-span-2 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
          {selected ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d3e]">
                <h2 className="text-white text-sm font-medium">{selected.domain}</h2>
                <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300">
                  <Plus size={14} /> Add Record
                </button>
              </div>
              {showForm && (
                <form onSubmit={addRecord} className="px-4 py-3 border-b border-[#2a2d3e] flex gap-2 flex-wrap">
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="bg-[#0f1117] border border-[#2a2d3e] text-white text-xs rounded px-2 py-1.5 focus:outline-none">
                    {['A','AAAA','CNAME','MX','TXT','NS','SRV','CAA'].map(t => <option key={t}>{t}</option>)}
                  </select>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" required className="bg-[#0f1117] border border-[#2a2d3e] text-white text-xs rounded px-2 py-1.5 w-28 focus:outline-none focus:border-indigo-500" />
                  <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="Value" required className="bg-[#0f1117] border border-[#2a2d3e] text-white text-xs rounded px-2 py-1.5 flex-1 min-w-32 focus:outline-none focus:border-indigo-500" />
                  {form.type === 'MX' && <input value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} placeholder="Priority" type="number" className="bg-[#0f1117] border border-[#2a2d3e] text-white text-xs rounded px-2 py-1.5 w-20 focus:outline-none" />}
                  <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded disabled:opacity-50">{saving ? '...' : 'Add'}</button>
                </form>
              )}
              <table className="w-full text-xs">
                <thead><tr className="border-b border-[#2a2d3e]">
                  {['Type','Name','Value','TTL',''].map(h => <th key={h} className="text-left text-[#64748b] font-medium px-4 py-2">{h}</th>)}
                </tr></thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130]">
                      <td className="px-4 py-2"><span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">{r.type}</span></td>
                      <td className="px-4 py-2 font-mono text-[#94a3b8]">{r.name}</td>
                      <td className="px-4 py-2 font-mono text-[#64748b] max-w-xs truncate">{r.value}</td>
                      <td className="px-4 py-2 text-[#64748b]">{r.ttl}</td>
                      <td className="px-4 py-2"><button onClick={() => deleteRecord(r.id)} className="p-1 text-[#64748b] hover:text-red-400 rounded"><Trash2 size={12} /></button></td>
                    </tr>
                  ))}
                  {records.length === 0 && <tr><td colSpan={5} className="text-center text-[#64748b] py-6">No records</td></tr>}
                </tbody>
              </table>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-[#64748b] text-sm">Select a zone to view records</div>
          )}
        </div>
      </div>
    </div>
  )
}
