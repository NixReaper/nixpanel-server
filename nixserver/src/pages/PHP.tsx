import React, { useEffect, useState } from 'react'
import { Cpu, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { api } from '../api/client'

interface PhpVersion { version: string; installed: boolean; active: boolean }
interface AccountPhp { id: number; username: string; domain: string; package: { phpVersion: string } | null }

export default function PHP() {
  const [versions, setVersions] = useState<PhpVersion[]>([])
  const [accounts, setAccounts] = useState<AccountPhp[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const [v, a] = await Promise.all([api.get('/nixserver/php/versions'), api.get('/nixserver/php/accounts')])
      setVersions(v.data.data)
      setAccounts(a.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const changeVersion = async (accountId: number, phpVersion: string) => {
    try {
      await api.put(`/nixserver/php/accounts/${accountId}`, { phpVersion })
      fetch()
    } catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">PHP</h1><p className="text-[#64748b] text-sm">Manage PHP versions per account</p></div>
        <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {/* Installed versions */}
      <div className="flex gap-3 flex-wrap">
        {versions.map(v => (
          <div key={v.version} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${v.installed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#1a1d27] border-[#2a2d3e]'}`}>
            <Cpu size={14} className={v.installed ? 'text-emerald-400' : 'text-[#64748b]'} />
            <span className="text-white font-mono">PHP {v.version}</span>
            {v.installed ? <CheckCircle size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-[#64748b]" />}
          </div>
        ))}
      </div>

      {/* Account PHP versions */}
      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2d3e]"><h2 className="text-white text-sm font-medium">Account PHP Versions</h2></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#2a2d3e]">
            {['Account', 'Domain', 'PHP Version', 'Change'].map(h => <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>)}
          </tr></thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130]">
                <td className="px-4 py-3 text-white">{a.username}</td>
                <td className="px-4 py-3 text-[#64748b]">{a.domain}</td>
                <td className="px-4 py-3"><span className="font-mono text-indigo-400 text-xs">PHP {a.package?.phpVersion ?? '8.3'}</span></td>
                <td className="px-4 py-3">
                  <select
                    defaultValue={a.package?.phpVersion ?? '8.3'}
                    onChange={e => changeVersion(a.id, e.target.value)}
                    className="bg-[#0f1117] border border-[#2a2d3e] text-[#94a3b8] text-xs rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                  >
                    {['7.4','8.0','8.1','8.2','8.3'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {!loading && accounts.length === 0 && <tr><td colSpan={4} className="text-center text-[#64748b] py-8">No accounts</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
