import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, UserCog, Globe, Mail, Shield,
  Server, Database, HardDrive, Settings, LogOut, Menu, X,
  Activity, Lock, BarChart3, Cpu
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const nav = [
  { label: 'Dashboard',   to: '/',            icon: LayoutDashboard },
  { label: 'Accounts',    to: '/accounts',    icon: Users },
  { label: 'Packages',    to: '/packages',    icon: Package },
  { label: 'Resellers',   to: '/resellers',   icon: UserCog },
  { label: 'DNS',         to: '/dns',         icon: Globe },
  { label: 'Email',       to: '/email',       icon: Mail },
  { label: 'SSL',         to: '/ssl',         icon: Lock },
  { label: 'PHP',         to: '/php',         icon: Cpu },
  { label: 'Web Server',  to: '/webserver',   icon: Server },
  { label: 'Services',    to: '/services',    icon: Activity },
  { label: 'Backup',      to: '/backup',      icon: HardDrive },
  { label: 'Security',    to: '/security',    icon: Shield },
  { label: 'System',      to: '/system',      icon: BarChart3 },
  { label: 'Settings',    to: '/settings',    icon: Settings },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117]">
      {/* Sidebar */}
      <aside
        className={`flex flex-col transition-all duration-200 bg-[#1a1d27] border-r border-[#2a2d3e] ${
          sidebarOpen ? 'w-56' : 'w-14'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-[#2a2d3e] min-h-[57px]">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-white text-sm font-semibold leading-tight">NixServer</p>
              <p className="text-[#64748b] text-xs">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {nav.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 mx-2 my-0.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'text-[#94a3b8] hover:bg-[#1e2130] hover:text-white'
                }`
              }
            >
              <Icon size={16} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t border-[#2a2d3e] p-3">
          {sidebarOpen && (
            <div className="px-1 mb-2">
              <p className="text-white text-xs font-medium truncate">{user?.username}</p>
              <p className="text-[#64748b] text-xs truncate">{user?.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-[#94a3b8] hover:bg-[#1e2130] hover:text-red-400 transition-colors text-sm"
          >
            <LogOut size={16} className="flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 py-3 bg-[#1a1d27] border-b border-[#2a2d3e] min-h-[57px]">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="text-[#64748b] hover:text-white transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex-1" />
          <span className="text-[#64748b] text-xs">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
