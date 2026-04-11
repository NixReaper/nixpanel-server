import React, { useEffect, useState } from 'react'
import { Save, RefreshCw, AlertTriangle } from 'lucide-react'
import { api } from '../api/client'
import ContactTab from './settings/ContactTab'
import BasicTab from './settings/BasicTab'
import NameserversSection from './settings/NameserversSection'

type Tab = 'contact' | 'basic'

const TABS: { id: Tab; label: string }[] = [
  { id: 'contact', label: 'Contact Information' },
  { id: 'basic',   label: 'Basic Config' },
]

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [interfaces, setInterfaces] = useState<string[]>([])
  const [tab, setTab] = useState<Tab>('contact')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [settingsRes, ifaceRes] = await Promise.allSettled([
        api.get('/nixserver/system/settings'),
        api.get('/nixserver/system/network-interfaces'),
      ])
      if (settingsRes.status === 'fulfilled') setSettings(settingsRes.value.data.data)
      if (ifaceRes.status === 'fulfilled')    setInterfaces(ifaceRes.value.data.data ?? [])
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleChange = (key: string, value: string) =>
    setSettings(s => ({ ...s, [key]: value }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.put('/nixserver/system/settings', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">Basic NixServer Setup</h1>
          <p className="text-[#64748b] text-sm mt-0.5">Configure server-wide defaults</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/40 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertTriangle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={save}>
        {/* Tab bar */}
        <div className="flex border-b border-[#2a2d3e]">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t.id
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-[#64748b] hover:text-[#94a3b8]',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-[#1a1d27] border border-[#2a2d3e] border-t-0 rounded-b-xl px-6 py-2">
          {tab === 'contact'
            ? <ContactTab settings={settings} onChange={handleChange} />
            : <BasicTab   settings={settings} onChange={handleChange} interfaces={interfaces} />
          }
        </div>

        <NameserversSection settings={settings} onChange={handleChange} />

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={saving || loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <Save size={14} />
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
          {saved && <span className="text-green-400 text-sm">Settings saved successfully.</span>}
        </div>
      </form>
    </div>
  )
}
