import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? (err instanceof Error ? err.message : 'Login failed'))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center mb-3">
            <span className="text-white text-xl font-bold">N</span>
          </div>
          <h1 className="text-white text-xl font-bold">NixClient</h1>
          <p className="text-[#64748b] text-sm mt-1">Hosting Control Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111827] border border-[#1e2d45] rounded-xl p-6 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div>
            <label className="block text-[#94a3b8] text-xs font-medium mb-1.5">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus
              className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="block text-[#94a3b8] text-xs font-medium mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-sky-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-[#64748b] text-xs mt-4">NixClient v0.3.2 · Port 2083</p>
      </div>
    </div>
  )
}
