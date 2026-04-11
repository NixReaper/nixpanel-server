import { useEffect, useState } from 'react'
import { Server, RefreshCw, RotateCcw, CheckCircle, XCircle } from 'lucide-react'
import { api } from '../api/client'

interface WebStatus {
  apache: { active: boolean }
  php82fpm: { active: boolean }
  php83fpm: { active: boolean }
}

export default function WebServer() {
  const [status, setStatus] = useState<WebStatus | null>(null)
  const [logs, setLogs] = useState<{ lines: string[] } | null>(null)
  const [logType, setLogType] = useState<'access' | 'error'>('access')
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [reloading, setReloading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [s, l] = await Promise.all([
        api.get('/nixserver/webserver/status'),
        api.get(`/nixserver/webserver/logs/${logType}`),
      ])
      setStatus(s.data.data)
      setLogs(l.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [logType])

  const testConfig = async () => {
    try {
      const r = await api.post('/nixserver/webserver/apache/test')
      setTestResult(r.data.data.output)
    } catch (err: unknown) {
      setTestResult((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Test failed')
    }
  }

  const reload = async (service: 'apache' | 'fpm82' | 'fpm83') => {
    setReloading(true)
    try {
      if (service === 'apache') {
        await api.post('/nixserver/webserver/apache/reload')
      } else {
        await api.post('/nixserver/webserver/fpm/reload', { version: service === 'fpm82' ? '8.2' : '8.3' })
      }
      fetchData()
    } catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Reload failed')
    } finally { setReloading(false) }
  }

  const services: { key: keyof WebStatus; label: string; reload?: 'apache' | 'fpm82' | 'fpm83' }[] = [
    { key: 'apache', label: 'apache2', reload: 'apache' },
    { key: 'php82fpm', label: 'php8.2-fpm', reload: 'fpm82' },
    { key: 'php83fpm', label: 'php8.3-fpm', reload: 'fpm83' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">Web Server</h1><p className="text-[#64748b] text-sm">Apache and PHP-FPM management</p></div>
        <button onClick={fetchData} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {status && (
        <div className="grid grid-cols-3 gap-4">
          {services.map(({ key, label, reload: reloadKey }) => (
            <div key={key} className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server size={16} className="text-[#64748b]" />
                <span className="text-white font-mono text-sm">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                {status[key].active
                  ? <CheckCircle size={16} className="text-emerald-400" />
                  : <XCircle size={16} className="text-red-400" />}
                {reloadKey && (
                  <button
                    onClick={() => reload(reloadKey)}
                    disabled={reloading}
                    title={`Reload ${label}`}
                    className="p-1 text-[#64748b] hover:text-indigo-400 rounded disabled:opacity-40"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={testConfig} className="flex items-center gap-2 border border-[#2a2d3e] text-[#94a3b8] text-sm px-3 py-2 rounded-lg hover:bg-[#1e2130]">Test Config</button>
        <button onClick={() => reload('apache')} disabled={reloading} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-3 py-2 rounded-lg">
          <RotateCcw size={14} /> Reload Apache
        </button>
      </div>

      {testResult && (
        <pre className="bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-4 text-xs text-[#94a3b8] overflow-x-auto whitespace-pre-wrap">{testResult}</pre>
      )}

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d3e]">
          <h2 className="text-white text-sm font-medium">Apache Logs</h2>
          <div className="flex gap-1">
            {(['access', 'error'] as const).map(t => (
              <button key={t} onClick={() => setLogType(t)} className={`px-3 py-1 text-xs rounded ${logType === t ? 'bg-indigo-600 text-white' : 'text-[#64748b] hover:text-white'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <pre className="p-4 text-xs text-[#64748b] font-mono leading-relaxed whitespace-pre-wrap">
            {logs?.lines.slice(-100).join('\n') ?? 'Loading...'}
          </pre>
        </div>
      </div>
    </div>
  )
}
