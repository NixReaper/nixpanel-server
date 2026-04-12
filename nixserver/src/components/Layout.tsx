import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117]">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 py-3 bg-[#1a1d27] border-b border-[#2a2d3e] min-h-[57px] flex-shrink-0">
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

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
