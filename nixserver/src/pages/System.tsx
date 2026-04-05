import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { api } from '../api/client'

interface SystemInfo { hostname: string; os: string; kernel: string; uptime: string }
interface Process { user: string; pid: string; cpu: string; mem: string; command: string }

export default function System() {
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [processes, setProcesses] = useState<Process[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const [infoR, procR] = await Promise.all([
        api.get('/nixserver/system/info'),
        api.get('/nixserver/system/processes'),
      ])
      setInfo(infoR.data.data)
      setProcesses(procR.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">System</h1><p className="text-[#64748b] text-sm">Server information and processes</p></div>
        <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {info && (
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[['Hostname', info.hostname], ['OS', info.os], ['Kernel', info.kernel], ['Uptime', info.uptime]].map(([k, v]) => (
            <div key={k}>
              <p className="text-[#64748b] text-xs mb-1">{k}</p>
              <p className="text-white text-sm font-mono">{v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2d3e]">
          <h2 className="text-white text-sm font-medium">Top Processes</h2>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-[#2a2d3e]">
            {['User', 'PID', 'CPU%', 'MEM%', 'Command'].map(h => (
              <th key={h} className="text-left text-[#64748b] font-medium px-4 py-2">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {processes.slice(0, 25).map((p, i) => (
              <tr key={i} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130]">
                <td className="px-4 py-2 text-[#94a3b8]">{p.user}</td>
                <td className="px-4 py-2 font-mono text-[#64748b]">{p.pid}</td>
                <td className="px-4 py-2 text-amber-400">{p.cpu}</td>
                <td className="px-4 py-2 text-blue-400">{p.mem}</td>
                <td className="px-4 py-2 text-[#64748b] max-w-xs truncate font-mono">{p.command}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
