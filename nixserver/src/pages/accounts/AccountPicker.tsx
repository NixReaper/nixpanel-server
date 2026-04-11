import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, User } from 'lucide-react'
import { api } from '../../api/client'

export interface PickedAccount {
  id: number
  username: string
  domain: string
  email: string
  status: string
  ipAddress: string | null
  package?: { name: string }
}

interface Props {
  onSelect: (account: PickedAccount) => void
  selected?: PickedAccount | null
  placeholder?: string
}

const statusColor: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  terminated: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function AccountPicker({ onSelect, selected, placeholder = 'Search by username, domain, or email...' }: Props) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<PickedAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const r = await api.get(`/nixserver/accounts?search=${encodeURIComponent(q)}&limit=10`)
      setResults(r.data.data.items)
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInput = (val: string) => {
    setSearch(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), 300)
  }

  const handleSelect = (acc: PickedAccount) => {
    onSelect(acc)
    setSearch('')
    setResults([])
    setOpen(false)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        )}
        <input
          value={search}
          onChange={e => handleInput(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#1a1d27] border border-[#2a2d3e] text-white text-sm rounded-lg pl-9 pr-9 py-2 focus:outline-none focus:border-indigo-500"
        />
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[#1e2130] border border-[#2a2d3e] rounded-lg shadow-xl overflow-hidden">
            {results.map(acc => (
              <button
                key={acc.id}
                onClick={() => handleSelect(acc)}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-[#2a2d3e] transition-colors text-left border-b border-[#2a2d3e] last:border-0"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{acc.username}</p>
                  <p className="text-[#64748b] text-xs truncate">{acc.domain} &mdash; {acc.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColor[acc.status] ?? ''}`}>
                  {acc.status}
                </span>
              </button>
            ))}
          </div>
        )}
        {open && !loading && results.length === 0 && search.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[#1e2130] border border-[#2a2d3e] rounded-lg shadow-xl px-4 py-3">
            <p className="text-[#64748b] text-sm">No accounts found</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="bg-[#1a1d27] border border-indigo-500/30 rounded-lg p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
            <User size={18} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium">{selected.username}</p>
            <p className="text-[#64748b] text-xs truncate">{selected.domain} &mdash; {selected.email}</p>
            {selected.package && (
              <p className="text-[#64748b] text-xs">Package: {selected.package.name}</p>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColor[selected.status] ?? ''}`}>
            {selected.status}
          </span>
        </div>
      )}
    </div>
  )
}
