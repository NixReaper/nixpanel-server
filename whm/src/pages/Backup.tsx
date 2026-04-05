import React, { useEffect, useState } from 'react'
import { HardDrive, Download, Trash2, RefreshCw, Play } from 'lucide-react'
import { api } from '../api/client'

interface Backup { path: string; filename: string; size: number; createdAt: string }

const fmtSize = (b: number) => b > 1024 * 1024 * 1024 ? `${(b / 1024 / 1024 / 1024).toFixed(1)} GB` : `${(b / 1024 / 1024).toFixed(0)} MB`

export default function Backup() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(false)
  const [backing, setBacking] = useState(false)
  const [accounts, setAccounts] = useState<{ id: number; username: string }[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')

  const fetch = async () => {
    setLoading(true)
    try {
      const [b, a] = await Promise.all([api.get('/whm/backup/list'), api.get('/whm/accounts?limit=100')])
      setBackups(b.data.data)
      setAccounts(a.data.data.items)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const backupAccount = async () => {
    if (!selectedAccount) return alert('Select an account')
    setBacking(true)
    try { await api.post(`/whm/backup/account/${selectedAccount}`); fetch() }
    catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Backup failed') }
    finally { setBacking(false) }
  }

  const backupServer = async () => {
    if (!confirm('Start a full server backup? This may take a while.')) return
    setBacking(true)
    try { await api.post('/whm/backup/server'); fetch() }
    catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Backup failed') }
    finally { setBacking(false) }
  }

  const del = async (path: string) => {
    if (!confirm('Delete this backup?')) return
    try { await api.delete('/whm/backup', { data: { path } }); fetch() }
    catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">Backup</h1><p className="text-[#64748b] text-sm">{backups.length} backup files</p></div>
        <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#2a2d3e] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
          <h2 className="text-white text-sm font-medium mb-3">Account Backup</h2>
          <div className="flex gap-2">
            <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className="flex-1 bg-[#0f1117] border border-[#2a2d3e] text-[#94a3b8] text-sm rounded px-3 py-2 focus:outline-none focus:border-indigo-500">
              <option value="">Select account...</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
            </select>
            <button onClick={backupAccount} disabled={backing} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-3 py-2 rounded-lg">
              <Play size={14} /> {backing ? 'Backing up...' : 'Backup'}
            </button>
          </div>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
          <h2 className="text-white text-sm font-medium mb-3">Full Server Backup</h2>
          <p className="text-[#64748b] text-xs mb-3">Backs up /etc, /home, and /var/www</p>
          <button onClick={backupServer} disabled={backing} className="flex items-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 text-sm px-3 py-2 rounded-lg disabled:opacity-50">
            <HardDrive size={14} /> Full Backup
          </button>
        </div>
      </div>

      {/* Backup list */}
      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#2a2d3e]">
            {['Filename', 'Size', 'Created', ''].map(h => <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>)}
          </tr></thead>
          <tbody>
            {backups.map(b => (
              <tr key={b.path} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2130]">
                <td className="px-4 py-3 font-mono text-white text-xs">{b.filename}</td>
                <td className="px-4 py-3 text-[#64748b]">{fmtSize(b.size)}</td>
                <td className="px-4 py-3 text-[#64748b] text-xs">{new Date(b.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3"><button onClick={() => del(b.path)} className="p-1 text-[#64748b] hover:text-red-400 rounded"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {!loading && backups.length === 0 && <tr><td colSpan={4} className="text-center text-[#64748b] py-8">No backups</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
