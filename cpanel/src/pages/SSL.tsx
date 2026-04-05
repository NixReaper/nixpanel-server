import React, { useEffect, useState } from 'react'
import { Lock, RefreshCw, RotateCcw } from 'lucide-react'
import { api } from '../api/client'

interface Cert { id: number; domain: string; status: string; issuedAt: string | null; expiresAt: string | null }

export default function SSL() {
  const [certs, setCerts] = useState<Cert[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try { const r = await api.get('/whm/ssl'); setCerts(r.data.data) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const renew = async (id: number) => {
    try { await api.post(`/whm/ssl/${id}/renew`); fetch() }
    catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Renewal failed') }
  }

  const days = (d: string | null) => {
    if (!d) return null
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  }

  const statusColor: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    expired: 'bg-red-500/10 text-red-400 border-red-500/20',
    revoked: 'bg-[#1a2235] text-[#64748b] border-[#1e2d45]',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">SSL Certificates</h1><p className="text-[#64748b] text-sm">Let's Encrypt certificates for your domains</p></div>
        <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#1e2d45] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#1e2d45]">
            {['Domain', 'Status', 'Expires', ''].map(h => <th key={h} className="text-left text-[#64748b] font-medium px-4 py-3 text-xs">{h}</th>)}
          </tr></thead>
          <tbody>
            {certs.map(c => {
              const d = days(c.expiresAt)
              return (
                <tr key={c.id} className="border-b border-[#1e2d45] last:border-0 hover:bg-[#1a2235]">
                  <td className="px-4 py-3 text-white flex items-center gap-2"><Lock size={12} className="text-emerald-400" />{c.domain}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[c.status] ?? ''}`}>{c.status}</span></td>
                  <td className="px-4 py-3 text-xs">
                    {c.expiresAt
                      ? <span className={d !== null && d < 14 ? 'text-red-400' : d !== null && d < 30 ? 'text-amber-400' : 'text-[#64748b]'}>
                          {d !== null && d > 0 ? `${d} days` : 'Expired'} ({new Date(c.expiresAt).toLocaleDateString()})
                        </span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.status === 'active' && (
                      <button onClick={() => renew(c.id)} className="flex items-center gap-1 px-2 py-1 text-xs text-sky-400 border border-sky-500/30 rounded hover:bg-sky-500/10">
                        <RotateCcw size={11} /> Renew
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {!loading && certs.length === 0 && <tr><td colSpan={4} className="text-center text-[#64748b] py-8">No certificates. Contact your host to issue SSL.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
