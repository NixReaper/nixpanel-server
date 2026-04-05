import React, { useEffect, useState } from 'react'
import { Save, RefreshCw } from 'lucide-react'
import { api } from '../api/client'

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try { const r = await api.get('/nixserver/system/settings'); setSettings(r.data.data) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try { await api.put('/nixserver/system/settings', settings); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">Settings</h1><p className="text-[#64748b] text-sm">System-wide configuration</p></div>
        <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      <form onSubmit={save} className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-6 space-y-3">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center gap-4">
            <label className="text-[#94a3b8] text-xs font-mono w-56 flex-shrink-0">{key}</label>
            <input
              value={value}
              onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
              className="flex-1 bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
        ))}
        <div className="pt-4">
          <button type="submit" disabled={saving} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg">
            <Save size={14} /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
