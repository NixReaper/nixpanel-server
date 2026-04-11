import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ArrowUpDown } from 'lucide-react'
import { api } from '../../api/client'
import AccountPicker, { type PickedAccount } from './AccountPicker'

interface Package {
  id: number
  name: string
  diskMb: number
  bandwidthMb: number
}

export default function Upgrade() {
  const [selected, setSelected] = useState<PickedAccount | null>(null)
  const [packageId, setPackageId] = useState<string>('')
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/nixserver/packages').then(r => setPackages(r.data.data?.items ?? r.data.data ?? [])).catch(() => {})
  }, [])

  const handleSelect = (acc: PickedAccount) => {
    setSelected(acc)
    setPackageId('')
    setMessage('')
    setError('')
  }

  const handleSubmit = async () => {
    if (!selected || !packageId) return
    setLoading(true); setMessage(''); setError('')
    try {
      await api.put(`/nixserver/accounts/${selected.id}`, { packageId: parseInt(packageId, 10) })
      const pkg = packages.find(p => p.id === parseInt(packageId, 10))
      setMessage(`Package for "${selected.username}" changed to "${pkg?.name ?? packageId}".`)
      if (pkg) setSelected(prev => prev ? { ...prev, package: { name: pkg.name } } : null)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/accounts" className="flex items-center gap-1 text-[#64748b] hover:text-white transition-colors">
          <ChevronLeft size={14} /> Accounts
        </Link>
        <span className="text-[#2a2d3e]">/</span>
        <span className="text-white">Upgrade / Downgrade an Account</span>
      </div>

      <div>
        <h1 className="text-white text-xl font-semibold">Upgrade / Downgrade an Account</h1>
        <p className="text-[#64748b] text-sm">Change the hosting package assigned to an account.</p>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-5 space-y-4">
        <AccountPicker onSelect={handleSelect} selected={selected} />

        {selected && (
          <div className="space-y-4 pt-2 border-t border-[#2a2d3e]">
            <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-4 py-3">
              <p className="text-[#64748b] text-xs mb-1">Current Package</p>
              <p className="text-white font-medium">{selected.package?.name ?? 'No package assigned'}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[#94a3b8] text-sm font-medium">New Package</label>
              <select
                value={packageId}
                onChange={e => setPackageId(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] text-[#94a3b8] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
              >
                <option value="">— Select a package —</option>
                {packages.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} &mdash; {p.diskMb.toLocaleString()} MB disk / {p.bandwidthMb.toLocaleString()} MB BW
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !packageId}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <ArrowUpDown size={16} /> {loading ? 'Applying...' : 'Apply Package Change'}
            </button>
          </div>
        )}

        {message && (
          <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">{message}</p>
        )}
        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
        )}
      </div>
    </div>
  )
}
