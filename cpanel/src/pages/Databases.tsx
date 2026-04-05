import React, { useEffect, useState } from 'react'
import { Database, Plus, Trash2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../api/client'

interface DbUser { id: number; username: string; host: string; privileges: string }
interface Db { id: number; name: string; charset: string; sizeMb: number; dbUsers: DbUser[] }

export default function Databases() {
  const [dbs, setDbs] = useState<Db[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [showDbModal, setShowDbModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dbForm, setDbForm] = useState({ name: '' })
  const [userForm, setUserForm] = useState({ username: '', password: '', privileges: 'ALL' })

  const fetch = async () => {
    setLoading(true)
    try { const r = await api.get('/cpanel/databases'); setDbs(r.data.data) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const createDb = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try { await api.post('/cpanel/databases', dbForm); setShowDbModal(false); setDbForm({ name: '' }); fetch() }
    catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
    finally { setSaving(false) }
  }

  const deleteDb = async (id: number) => {
    if (!confirm('Delete this database and all its data?')) return
    try { await api.delete(`/cpanel/databases/${id}`); fetch() }
    catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
  }

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showUserModal) return
    setSaving(true); setError('')
    try { await api.post(`/cpanel/databases/${showUserModal}/users`, userForm); setShowUserModal(null); setUserForm({ username: '', password: '', privileges: 'ALL' }); fetch() }
    catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed') }
    finally { setSaving(false) }
  }

  const deleteUser = async (dbId: number, userId: number) => {
    try { await api.delete(`/cpanel/databases/${dbId}/users/${userId}`); fetch() }
    catch {}
  }

  const toggle = (id: number) => {
    const next = new Set(expanded)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpanded(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-xl font-semibold">Databases</h1><p className="text-[#64748b] text-sm">{dbs.length} databases</p></div>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 text-[#64748b] hover:text-white border border-[#1e2d45] rounded-lg"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => setShowDbModal(true)} className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white text-sm px-3 py-2 rounded-lg"><Plus size={16} /> New Database</button>
        </div>
      </div>

      <div className="space-y-2">
        {dbs.map(db => (
          <div key={db.id} className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#1a2235]" onClick={() => toggle(db.id)}>
              {expanded.has(db.id) ? <ChevronDown size={14} className="text-[#64748b]" /> : <ChevronRight size={14} className="text-[#64748b]" />}
              <Database size={14} className="text-sky-400" />
              <span className="text-white font-mono text-sm flex-1">{db.name}</span>
              <span className="text-[#64748b] text-xs">{db.dbUsers.length} user(s)</span>
              <button onClick={e => { e.stopPropagation(); setShowUserModal(db.id) }} className="text-xs text-sky-400 hover:text-sky-300 px-2"><Plus size={12} /> User</button>
              <button onClick={e => { e.stopPropagation(); deleteDb(db.id) }} className="p-1 text-[#64748b] hover:text-red-400 rounded"><Trash2 size={14} /></button>
            </div>
            {expanded.has(db.id) && db.dbUsers.length > 0 && (
              <div className="border-t border-[#1e2d45] px-4 py-2">
                {db.dbUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-1.5">
                    <div>
                      <span className="text-[#94a3b8] font-mono text-xs">{u.username}@{u.host}</span>
                      <span className="ml-3 text-xs text-[#64748b]">{u.privileges}</span>
                    </div>
                    <button onClick={() => deleteUser(db.id, u.id)} className="p-1 text-[#64748b] hover:text-red-400 rounded"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {!loading && dbs.length === 0 && <div className="text-center text-[#64748b] py-12 text-sm">No databases yet</div>}
      </div>

      {/* Create DB modal */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#111827] border border-[#1e2d45] rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-[#1e2d45]">
              <h2 className="text-white font-medium">New Database</h2>
              <button onClick={() => setShowDbModal(false)} className="text-[#64748b] hover:text-white">✕</button>
            </div>
            <form onSubmit={createDb} className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded">{error}</div>}
              <div>
                <label className="block text-[#94a3b8] text-xs mb-1">Database Name</label>
                <p className="text-[#64748b] text-xs mb-2">Will be prefixed with your username</p>
                <input value={dbForm.name} onChange={e => setDbForm({ name: e.target.value })} required placeholder="mydb"
                  className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDbModal(false)} className="flex-1 border border-[#1e2d45] text-[#94a3b8] text-sm py-2 rounded hover:bg-[#1a2235]">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm py-2 rounded">{saving ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#111827] border border-[#1e2d45] rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-[#1e2d45]">
              <h2 className="text-white font-medium">Add Database User</h2>
              <button onClick={() => setShowUserModal(null)} className="text-[#64748b] hover:text-white">✕</button>
            </div>
            <form onSubmit={createUser} className="p-4 space-y-3">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded">{error}</div>}
              {[['Username', 'username', 'text'], ['Password', 'password', 'password']].map(([l, k, t]) => (
                <div key={k}>
                  <label className="block text-[#94a3b8] text-xs mb-1">{l}</label>
                  <input type={t} value={userForm[k as keyof typeof userForm]} onChange={e => setUserForm(f => ({ ...f, [k]: e.target.value }))} required
                    className="w-full bg-[#0a0f1a] border border-[#1e2d45] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-sky-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUserModal(null)} className="flex-1 border border-[#1e2d45] text-[#94a3b8] text-sm py-2 rounded">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm py-2 rounded">{saving ? '...' : 'Add User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
