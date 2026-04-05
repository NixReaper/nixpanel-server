import React, { useEffect, useState } from 'react'
import { Folder, FileText, ChevronRight, Trash2, Pencil, Plus, Upload, RefreshCw, FolderPlus, Save, X } from 'lucide-react'
import { api } from '../api/client'

interface FileEntry { name: string; type: 'file' | 'directory'; size: number; mtime: string; path: string }

const fmtSize = (b: number) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : b > 1024 ? `${(b / 1024).toFixed(0)} KB` : `${b} B`

export default function FileManager() {
  const [path, setPath] = useState('/')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<{ path: string; content: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [newDir, setNewDir] = useState('')
  const [showNewDir, setShowNewDir] = useState(false)

  const loadDir = async (p: string) => {
    setLoading(true); setSelected(new Set())
    try {
      const r = await api.get(`/nixclient/files?path=${encodeURIComponent(p)}`)
      setFiles(r.data.data.files); setPath(r.data.data.path)
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to load directory')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadDir('/') }, [])

  const navigate = (entry: FileEntry) => {
    if (entry.type === 'directory') loadDir(entry.path)
    else openFile(entry.path)
  }

  const openFile = async (filePath: string) => {
    try {
      const r = await api.get(`/nixclient/files/content?path=${encodeURIComponent(filePath)}`)
      setEditing({ path: filePath, content: r.data.data.content })
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Cannot open file')
    }
  }

  const saveFile = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await api.put('/nixclient/files/content', { path: editing.path, content: editing.content })
      setEditing(null)
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Save failed')
    } finally { setSaving(false) }
  }

  const deleteSelected = async () => {
    if (!selected.size || !confirm(`Delete ${selected.size} item(s)?`)) return
    try {
      await api.delete('/nixclient/files', { data: { paths: Array.from(selected) } })
      loadDir(path)
    } catch {}
  }

  const createDir = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/nixclient/files/mkdir', { path: `${path}/${newDir}` })
      setNewDir(''); setShowNewDir(false); loadDir(path)
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed')
    }
  }

  // Breadcrumb
  const parts = path.split('/').filter(Boolean)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-semibold">File Manager</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={deleteSelected} className="flex items-center gap-1.5 text-xs text-red-400 border border-red-500/30 px-3 py-2 rounded-lg hover:bg-red-500/10">
              <Trash2 size={14} /> Delete ({selected.size})
            </button>
          )}
          <button onClick={() => setShowNewDir(v => !v)} className="flex items-center gap-1.5 text-xs text-[#94a3b8] border border-[#1e2d45] px-3 py-2 rounded-lg hover:bg-[#1a2235]">
            <FolderPlus size={14} /> New Folder
          </button>
          <button onClick={() => loadDir(path)} className="p-2 text-[#64748b] hover:text-white border border-[#1e2d45] rounded-lg">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-[#64748b]">
        <button onClick={() => loadDir('/')} className="hover:text-white">~</button>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={12} />
            <button onClick={() => loadDir('/' + parts.slice(0, i + 1).join('/'))} className="hover:text-white">{part}</button>
          </React.Fragment>
        ))}
      </div>

      {/* New dir form */}
      {showNewDir && (
        <form onSubmit={createDir} className="flex gap-2">
          <input value={newDir} onChange={e => setNewDir(e.target.value)} placeholder="folder-name" autoFocus required
            className="bg-[#111827] border border-[#1e2d45] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500" />
          <button type="submit" className="bg-sky-500 hover:bg-sky-400 text-white text-sm px-3 py-2 rounded-lg">Create</button>
          <button type="button" onClick={() => setShowNewDir(false)} className="text-[#64748b] hover:text-white px-2"><X size={16} /></button>
        </form>
      )}

      {/* File list */}
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#1e2d45]">
            <th className="w-8 px-4 py-2"></th>
            {['Name', 'Size', 'Modified', ''].map(h => <th key={h} className="text-left text-[#64748b] font-medium px-4 py-2 text-xs">{h}</th>)}
          </tr></thead>
          <tbody>
            {path !== '/' && (
              <tr className="border-b border-[#1e2d45] hover:bg-[#1a2235] cursor-pointer" onClick={() => loadDir(path.split('/').slice(0, -1).join('/') || '/')}>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2 text-[#64748b]" colSpan={3}>..</td>
              </tr>
            )}
            {files.map(f => (
              <tr key={f.name} className="border-b border-[#1e2d45] last:border-0 hover:bg-[#1a2235] cursor-pointer">
                <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(f.path)} onChange={e => {
                    const next = new Set(selected)
                    e.target.checked ? next.add(f.path) : next.delete(f.path)
                    setSelected(next)
                  }} className="accent-sky-500" />
                </td>
                <td className="px-4 py-2" onClick={() => navigate(f)}>
                  <span className="flex items-center gap-2">
                    {f.type === 'directory'
                      ? <Folder size={14} className="text-amber-400 flex-shrink-0" />
                      : <FileText size={14} className="text-[#64748b] flex-shrink-0" />}
                    <span className={f.type === 'directory' ? 'text-white' : 'text-[#94a3b8]'}>{f.name}</span>
                  </span>
                </td>
                <td className="px-4 py-2 text-[#64748b] text-xs">{f.type === 'file' ? fmtSize(f.size) : '—'}</td>
                <td className="px-4 py-2 text-[#64748b] text-xs">{new Date(f.mtime).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  {f.type === 'file' && (
                    <button onClick={() => openFile(f.path)} className="p-1 text-[#64748b] hover:text-white rounded"><Pencil size={13} /></button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && files.length === 0 && <tr><td colSpan={5} className="text-center text-[#64748b] py-8">Empty directory</td></tr>}
          </tbody>
        </table>
      </div>

      {/* File editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0f1a]">
          <div className="flex items-center justify-between px-4 py-3 bg-[#111827] border-b border-[#1e2d45]">
            <span className="text-white text-sm font-mono">{editing.path}</span>
            <div className="flex gap-2">
              <button onClick={saveFile} disabled={saving} className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg">
                <Save size={14} /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(null)} className="p-1.5 text-[#64748b] hover:text-white"><X size={18} /></button>
            </div>
          </div>
          <textarea
            value={editing.content}
            onChange={e => setEditing(ed => ed ? { ...ed, content: e.target.value } : null)}
            className="flex-1 bg-[#0a0f1a] text-[#94a3b8] font-mono text-xs p-4 resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  )
}
