import React, { useEffect, useState } from 'react'
import { Play, Square, RefreshCw, AlertCircle, CheckCircle, MinusCircle } from 'lucide-react'
import { api } from '../api/client'

interface Service { name: string; status: 'running' | 'stopped' | 'failed' | 'unknown'; enabled: boolean }

const statusIcon = {
  running: <CheckCircle size={14} className="text-emerald-400" />,
  stopped: <MinusCircle size={14} className="text-[#64748b]" />,
  failed: <AlertCircle size={14} className="text-red-400" />,
  unknown: <MinusCircle size={14} className="text-[#64748b]" />,
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<string | null>(null)

  const fetch = async () => {
    setLoading(true)
    try { const r = await api.get('/whm/services'); setServices(r.data.data) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const act = async (name: string, action: string) => {
    setActing(name + action)
    try { await api.post(`/whm/services/${name}`, { action }); fetch() }
    catch (e: unknown) { alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
    finally { setActing(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">Services</h1><p className="text-[#64748b] text-sm">Manage system services</p></div>
        <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#2a2d3e]">
            {['Service', 'Status', 'Startup', 'Actions'].map(h => (
              <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {services.map(s => (
              <tr key={s.name} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130]">
                <td className="px-4 py-3 text-white font-mono text-xs">{s.name}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    {statusIcon[s.status]}
                    <span className={s.status === 'running' ? 'text-emerald-400' : s.status === 'failed' ? 'text-red-400' : 'text-[#64748b]'}>
                      {s.status}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${s.enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-[#1e2130] text-[#64748b] border-[#2a2d3e]'}`}>
                    {s.enabled ? 'enabled' : 'disabled'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {s.status !== 'running' && (
                      <button onClick={() => act(s.name, 'start')} disabled={!!acting} className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded hover:bg-emerald-500/20">
                        {acting === s.name + 'start' ? '...' : 'Start'}
                      </button>
                    )}
                    {s.status === 'running' && (
                      <button onClick={() => act(s.name, 'stop')} disabled={!!acting} className="px-2 py-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:bg-red-500/20">
                        {acting === s.name + 'stop' ? '...' : 'Stop'}
                      </button>
                    )}
                    <button onClick={() => act(s.name, 'restart')} disabled={!!acting} className="px-2 py-1 text-xs bg-[#1e2130] text-[#94a3b8] border border-[#2a2d3e] rounded hover:border-indigo-500">
                      {acting === s.name + 'restart' ? '...' : 'Restart'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && services.length === 0 && (
              <tr><td colSpan={4} className="text-center text-[#64748b] py-8">No services found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
