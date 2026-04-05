import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '../api/client'

interface Package { id: number; name: string }

export default function CreateAccount() {
  const navigate = useNavigate()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    username: '', password: '', email: '', domain: '', packageId: '',
  })

  useEffect(() => {
    api.get('/whm/packages').then(r => setPackages(r.data.data)).catch(() => {})
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/whm/accounts', {
        ...form,
        packageId: form.packageId ? parseInt(form.packageId, 10) : undefined,
      })
      navigate('/accounts')
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#64748b] hover:text-white text-sm mb-4 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-white text-xl font-semibold mb-1">Create Account</h1>
      <p className="text-[#64748b] text-sm mb-6">Provision a new hosting account</p>

      <form onSubmit={handleSubmit} className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-6 space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}

        {[
          { key: 'username', label: 'Username', type: 'text', placeholder: 'john', hint: 'Lowercase letters, numbers, hyphens' },
          { key: 'domain', label: 'Primary Domain', type: 'text', placeholder: 'example.com' },
          { key: 'email', label: 'Contact Email', type: 'email', placeholder: 'john@example.com' },
          { key: 'password', label: 'cPanel Password', type: 'password', placeholder: '••••••••', hint: 'Min 8 characters' },
        ].map(({ key, label, type, placeholder, hint }) => (
          <div key={key}>
            <label className="block text-[#94a3b8] text-xs font-medium mb-1.5">{label}</label>
            <input
              type={type}
              value={form[key as keyof typeof form]}
              onChange={set(key as keyof typeof form)}
              required
              placeholder={placeholder}
              className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500"
            />
            {hint && <p className="text-[#64748b] text-xs mt-1">{hint}</p>}
          </div>
        ))}

        <div>
          <label className="block text-[#94a3b8] text-xs font-medium mb-1.5">Package</label>
          <select
            value={form.packageId}
            onChange={set('packageId')}
            className="w-full bg-[#0f1117] border border-[#2a2d3e] text-[#94a3b8] text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">No package (unlimited)</option>
            {packages.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 border border-[#2a2d3e] text-[#94a3b8] text-sm py-2.5 rounded-lg hover:bg-[#1e2130] transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm py-2.5 rounded-lg transition-colors">
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  )
}
