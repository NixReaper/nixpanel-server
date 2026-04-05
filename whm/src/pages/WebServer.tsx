import React, { useEffect, useState } from 'react'
import { Server, RefreshCw, RotateCcw, CheckCircle, XCircle } from 'lucide-react'
import { api } from '../api/client'

export default function WebServer() {
  const [status, setStatus] = useState<{ nginx: { active: boolean }; apache: { active: boolean } } | null>(null)
  const [vhosts, setVhosts] = useState<{ domain: string; path: string }[]>([])
  const [logs, setLogs] = useState<{ lines: string[] } | null>(null)
  const [logType, setLogType] = useState<'access' | 'error'>('access')
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const fetch = async () => {
    setLoading(true)
    try {
      const [s, v, l] = await Promise.all([
        api.get('/whm/webserver/status'),
        api.get('/whm/webserver/vhosts'),
        api.get(`/whm/webserver/logs/${logType}`),
      ])
      setStatus(s.data.data); setVhosts(v.data.data); setLogs(l.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [logType])

  const testConfig = async () => {
    const r = await api.post('/whm/webserver/nginx/test')
    setTestResult(r.data.data.output)
  }

  const reload = async () => {
    try { await api.post('/whm/webserver/nginx/reload'); fetch() }
    catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Reload failed') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">Web Server</h1><p className="text-[#64748b] text-sm">Nginx and Apache management</p></div>
        <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {status && (
        <div className="grid grid-cols-2 gap-4">
          {[['nginx', status.nginx.active], ['apache2', status.apache.active]].map(([name, active]) => (
            <div key={String(name)} className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server size={16} className="text-[#64748b]" />
                <span className="text-white font-mono text-sm">{name}</span>
              </div>
              {active ? <CheckCircle size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={testConfig} className="flex items-center gap-2 border border-[#2a2d3e] text-[#94a3b8] text-sm px-3 py-2 rounded-lg hover:bg-[#1e2130]">Test Config</button>
        <button onClick={reload} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-2 rounded-lg"><RotateCcw size={14} /> Reload nginx</button>
      </div>

      {testResult && (
        <pre className="bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-4 text-xs text-[#94a3b8] overflow-x-auto">{testResult}</pre>
      )}

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d3e]">
          <h2 className="text-white text-sm font-medium">Logs</h2>
          <div className="flex gap-1">
            {(['access', 'error'] as const).map(t => (
              <button key={t} onClick={() => setLogType(t)} className={`px-3 py-1 text-xs rounded ${logType === t ? 'bg-indigo-600 text-white' : 'text-[#64748b] hover:text-white'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <pre className="p-4 text-xs text-[#64748b] font-mono leading-relaxed">
            {logs?.lines.slice(-100).join('\n') ?? 'Loading...'}
          </pre>
        </div>
      </div>
    </div>
  )
}
