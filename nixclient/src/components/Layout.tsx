import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, Database, Mail, Lock,
  Globe, Anchor, Clock, LogOut, Menu, X, BarChart3, User
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const nav = [
  { label: 'Overview',    to: '/',            icon: LayoutDashboard },
  { label: 'File Manager',to: '/files',       icon: FolderOpen },
  { label: 'Databases',   to: '/databases',   icon: Database },
  { label: 'Email',       to: '/email',       icon: Mail },
  { label: 'SSL',         to: '/ssl',         icon: Lock },
  { label: 'Domains',     to: '/domains',     icon: Globe },
  { label: 'FTP Accounts',to: '/ftp',         icon: Anchor },
  { label: 'Cron Jobs',   to: '/cron',        icon: Clock },
  { label: 'Statistics',  to: '/stats',       icon: BarChart3 },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0f1a]">
      <aside className={`flex flex-col transition-all duration-200 bg-[#111827] border-r border-[#1e2d45] ${sidebarOpen ? 'w-52' : 'w-14'}`}>
        <div className="flex items-center gap-2 px-4 py-4 border-b border-[#1e2d45] min-h-[57px]">
          <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-white text-sm font-semibold leading-tight">NixClient</p>
              <p className="text-[#64748b] text-xs truncate">{user?.domain}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {nav.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 mx-2 my-0.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-sky-500/20 text-sky-400' : 'text-[#94a3b8] hover:bg-[#1a2235] hover:text-white'
                }`
              }
            >
              <Icon size={16} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[#1e2d45] p-3">
          {sidebarOpen && (
            <div className="flex items-center gap-2 px-1 mb-2">
              <User size={14} className="text-[#64748b] flex-shrink-0" />
              <p className="text-white text-xs font-medium truncate">{user?.username}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-[#94a3b8] hover:bg-[#1a2235] hover:text-red-400 transition-colors text-sm"
          >
            <LogOut size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-3 bg-[#111827] border-b border-[#1e2d45] min-h-[57px]">
          <button onClick={() => setSidebarOpen(v => !v)} className="text-[#64748b] hover:text-white transition-colors">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex-1" />
          <span className="text-[#64748b] text-xs font-mono">{user?.domain}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
