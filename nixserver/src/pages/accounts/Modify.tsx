import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
import { api } from '../../api/client'
import AccountPicker, { type PickedAccount } from './AccountPicker'

interface Package {
  id: number
  name: string
  diskMb: number
  bandwidthMb: number
}

export default function Modify() {
  const [selected, setSelected] = useState<PickedAccount | null>(null)
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
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
    setEmail(acc.email)
    setNotes('')
    setPackageId('')
    setMessage('')
    setError('')
  }

  const handleSubmit = async () => {
    if (!selected) return
    setLoading(true); setMessage(''); setError('')
    const body: Record<string, unknown> = {}
    if (email && email !== selected.email) body.email = email
    if (notes) body.notes = notes
    if (packageId) body.packageId = parseInt(packageId, 10)

    try {
      await api.put(`/nixserver/accounts/${selected.id}`, body)
      setMessage(`Account "${selected.username}" has been updated.`)
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
        <span className="text-white">Modify an Account</span>
      </div>

      <div>
        <h1 className="text-white text-xl font-semibold">Modify an Account</h1>
        <p className="text-[#64748b] text-sm">Update account settings such as email, notes, or package.</p>
      </div>

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-5 space-y-4">
        <AccountPicker onSelect={handleSelect} selected={selected} />

        {selected && (
          <div className="space-y-4 pt-2 border-t border-[#2a2d3e]">
            <div className="space-y-2">
              <label className="block text-[#94a3b8] text-sm font-medium">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[#94a3b8] text-sm font-medium">Package</label>
              <select
                value={packageId}
                onChange={e => setPackageId(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] text-[#94a3b8] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
              >
                <option value="">— Keep current ({selected.package?.name ?? 'none'}) —</option>
                {packages.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[#94a3b8] text-sm font-medium">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes about this account..."
                className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
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
