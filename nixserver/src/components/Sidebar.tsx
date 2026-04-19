import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, LogOut, Menu, X,
  ChevronDown, ChevronRight, Search, RefreshCcw,
  ArrowUpCircle, CheckCircle2, AlertCircle, Loader2, ExternalLink,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import { getNav, isItemActive } from './navData'

type VersionInfo = {
  currentVersion: string
  latestVersion: string | null
  updateAvailable: boolean
}

type UpgradeState = 'idle' | 'confirm' | 'running' | 'restarting' | 'ready' | 'error'

interface SidebarProps {
  open: boolean
  onToggle: () => void
}

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const { user, logout, enabledModules, hasModule } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [versionError, setVersionError] = useState(false)
  const [upgradeState, setUpgradeState] = useState<UpgradeState>('idle')
  const nav = useMemo(() => getNav(enabledModules), [enabledModules])
  const canManageSystem = hasModule('system')

  // ── Version checking ───────────────────────────────────────────────────────

  const fetchVersion = useCallback(async (manual = false) => {
    setVersionError(false)
    if (manual) setVersionInfo(null)
    try {
      const { data } = await api.get('/nixserver/system/version', {
        timeout: 10_000,
        params: { _t: Date.now() },
      })
      setVersionInfo(data.data)
    } catch {
      setVersionError(true)
    }
  }, [])

  useEffect(() => {
    if (!canManageSystem) return
    fetchVersion()
  }, [canManageSystem, fetchVersion])

  useEffect(() => {
    if (!canManageSystem || !versionError) return
    const t = setTimeout(fetchVersion, 5_000)
    return () => clearTimeout(t)
  }, [canManageSystem, versionError, fetchVersion])

  const handleUpgrade = async () => {
    if (upgradeState === 'confirm') {
      setUpgradeState('running')
      try {
        await api.post('/nixserver/system/upgrade')
        setUpgradeState('ready')
      } catch {
        setUpgradeState('error')
      }
    } else {
      setUpgradeState('confirm')
    }
  }

  // ── Category open/close ────────────────────────────────────────────────────

  const [openCats, setOpenCats] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const active = nav.find(cat =>
      cat.items.some(item => isItemActive(item.to, location.pathname))
    )
    if (active) {
      setOpenCats(prev => prev.has(active.id) ? prev : new Set([...prev, active.id]))
    }
  }, [location.pathname, nav])

  const toggleCat = (id: string) => {
    setOpenCats(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Search filter ──────────────────────────────────────────────────────────

  const filteredNav = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return nav
    return nav.map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.label.toLowerCase().includes(q)),
    })).filter(cat => cat.items.length > 0 || cat.label.toLowerCase().includes(q))
  }, [nav, search])

  const effectiveOpen = (id: string) =>
    search.trim() ? filteredNav.some(c => c.id === id) : openCats.has(id)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <aside
      className={`flex flex-col transition-all duration-200 bg-[#1a1d27] border-r border-[#2a2d3e] overflow-hidden flex-shrink-0 ${
        open ? 'w-72' : 'w-0'
      }`}
    >
      {/* Branding + toggle */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-[#2a2d3e] min-h-[57px] flex-shrink-0">
        <button onClick={onToggle} className="text-[#64748b] hover:text-white transition-colors mr-1">
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">N</span>
        </div>
        <div className="overflow-hidden">
          <p className="text-white text-sm font-semibold leading-tight whitespace-nowrap">NixServer</p>
          <p className="text-[#64748b] text-xs whitespace-nowrap">Admin Panel</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[#2a2d3e] flex-shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4a5568] pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-md text-xs text-[#94a3b8] placeholder-[#4a5568] pl-7 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-[#94a3b8]"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        <Link
          to="/"
          className={`flex items-center gap-2.5 px-3 py-1.5 mx-2 my-0.5 rounded-md text-xs transition-colors ${
            location.pathname === '/'
              ? 'bg-indigo-600/20 text-indigo-400'
              : 'text-[#94a3b8] hover:bg-[#1e2130] hover:text-white'
          }`}
        >
          <LayoutDashboard size={13} className="flex-shrink-0" />
          <span className="truncate">Dashboard</span>
        </Link>

        {filteredNav.map(cat => {
          const isOpen = effectiveOpen(cat.id)
          const Icon = cat.icon
          const hasActive = cat.items.some(item => isItemActive(item.to, location.pathname))

          return (
            <div key={cat.id} className="mx-2 my-0.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => !search.trim() && toggleCat(cat.id)}
                  className={`flex items-center gap-2 flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    hasActive && !search.trim()
                      ? 'text-indigo-300'
                      : 'text-[#64748b] hover:text-[#94a3b8]'
                  } ${search.trim() ? 'cursor-default' : ''}`}
                >
                  <Icon size={13} className="flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{cat.label}</span>
                  {!search.trim() && (
                    isOpen
                      ? <ChevronDown size={11} className="flex-shrink-0 opacity-60" />
                      : <ChevronRight size={11} className="flex-shrink-0 opacity-60" />
                  )}
                </button>
                {cat.to && (
                  <Link
                    to={cat.to}
                    title={`${cat.label} overview`}
                    className="p-1 text-[#374151] hover:text-indigo-400 transition-colors flex-shrink-0"
                  >
                    <ExternalLink size={10} />
                  </Link>
                )}
              </div>

              {isOpen && (
                <div className="ml-3 pl-2 border-l border-[#2a2d3e] mt-0.5 mb-1">
                  {cat.items.map(item => {
                    const active = isItemActive(item.to, location.pathname)
                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        className={`block px-2 py-1 rounded text-xs transition-colors truncate ${
                          active
                            ? 'text-indigo-400 bg-indigo-600/10'
                            : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[#1e2130]'
                        }`}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {search.trim() && filteredNav.length === 0 && (
          <p className="text-center text-[#4a5568] text-xs py-6">No results</p>
        )}
      </nav>

      {/* Version + upgrade */}
      {canManageSystem && (
      <div className="border-t border-[#2a2d3e] px-3 pt-2.5 pb-1 flex-shrink-0">
        {versionInfo ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                {versionInfo.updateAvailable ? (
                  <AlertCircle size={11} className="text-amber-400 flex-shrink-0" />
                ) : (
                  <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
                )}
                <span className="text-[#64748b] text-[10px]">v{versionInfo.currentVersion}</span>
                {versionInfo.updateAvailable && versionInfo.latestVersion && (
                  <span className="text-amber-400 text-[10px]">→ v{versionInfo.latestVersion}</span>
                )}
              </div>
              <button
                onClick={() => fetchVersion(true)}
                title="Check for updates"
                className="text-[#4a5568] hover:text-[#94a3b8] transition-colors"
              >
                <RefreshCcw size={10} />
              </button>
            </div>

            {upgradeState === 'ready' ? (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-emerald-600/10 text-emerald-400 text-[10px]">
                <CheckCircle2 size={11} />
                <span>Upgrade started — panel restarting…</span>
              </div>
            ) : upgradeState === 'error' ? (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-red-600/10 text-red-400 text-[10px]">
                <AlertCircle size={11} />
                <span>Upgrade failed — check logs</span>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <button
                  onClick={handleUpgrade}
                  disabled={upgradeState === 'running'}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
                    upgradeState === 'confirm'
                      ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                      : versionInfo.updateAvailable
                        ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30'
                        : 'bg-[#1e2130] text-[#64748b] hover:text-[#94a3b8]'
                  }`}
                >
                  {upgradeState === 'running' ? (
                    <><Loader2 size={10} className="animate-spin" /><span>Upgrading…</span></>
                  ) : upgradeState === 'confirm' ? (
                    <><ArrowUpCircle size={10} /><span>Confirm upgrade</span></>
                  ) : versionInfo.updateAvailable ? (
                    <><ArrowUpCircle size={10} /><span>Upgrade available</span></>
                  ) : (
                    <><ArrowUpCircle size={10} /><span>Upgrade panel</span></>
                  )}
                </button>
                {upgradeState === 'confirm' && (
                  <button
                    onClick={() => setUpgradeState('idle')}
                    className="px-2 py-1.5 rounded-md bg-[#1e2130] text-[#64748b] hover:text-[#94a3b8] text-[10px] transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        ) : versionError ? (
          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-[#4a5568] text-[10px]">Version unavailable</span>
            <button onClick={() => fetchVersion(true)} title="Retry" className="text-[#4a5568] hover:text-[#94a3b8] transition-colors">
              <RefreshCcw size={10} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-1 py-1">
            <Loader2 size={10} className="animate-spin text-[#4a5568]" />
            <span className="text-[#4a5568] text-[10px]">Checking version…</span>
          </div>
        )}
      </div>
      )}

      {/* User + logout */}
      <div className="border-t border-[#2a2d3e] p-3 flex-shrink-0">
        <div className="px-1 mb-2">
          <p className="text-white text-xs font-medium truncate">{user?.username}</p>
          <p className="text-[#64748b] text-xs truncate">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-[#94a3b8] hover:bg-[#1e2130] hover:text-red-400 transition-colors text-xs"
        >
          <LogOut size={14} className="flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
