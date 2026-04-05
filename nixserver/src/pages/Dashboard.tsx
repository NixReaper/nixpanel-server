import React, { useEffect, useState, useRef } from 'react'
import { Users, Server, HardDrive, Activity } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'

interface SystemStats {
  cpu: number
  memory: { total: number; used: number; free: number; percent: number }
  disk: { total: number; used: number; free: number; percent: number }
  load: [number, number, number]
  uptime: number
}

interface AccountStats {
  total: number
  active: number
  suspended: number
  terminated: number
}

interface StatCard {
  label: string
  value: string | number
  sub?: string
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  color: string
}

const formatBytes = (bytes: number) => {
  const gb = bytes / 1024 / 1024 / 1024
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1024 / 1024).toFixed(0)} MB`
}

export default function Dashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null)
  const [cpuHistory, setCpuHistory] = useState<{ t: string; cpu: number; mem: number }[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    api.get('/nixserver/accounts/stats').then(r => setAccountStats(r.data.data)).catch(() => {})
    api.get('/nixserver/system/stats').then(r => setStats(r.data.data)).catch(() => {})

    // WebSocket live stats
    const token = localStorage.getItem('access_token')
    if (token) {
      const ws = new WebSocket(`ws://${window.location.hostname}:2087/ws/stats?token=${token}`)
      wsRef.current = ws
      ws.onmessage = e => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'stats') {
          setStats(msg.data)
          setCpuHistory(prev => [
            ...prev.slice(-29),
            { t: new Date().toLocaleTimeString(), cpu: msg.data.cpu, mem: msg.data.memory.percent },
          ])
        }
      }
    }

    return () => wsRef.current?.close()
  }, [])

  const cards: StatCard[] = [
    {
      label: 'Total Accounts',
      value: accountStats?.total ?? '—',
      sub: `${accountStats?.active ?? 0} active`,
      icon: Users,
      color: 'text-indigo-400',
    },
    {
      label: 'CPU Usage',
      value: stats ? `${stats.cpu}%` : '—',
      sub: `Load: ${stats?.load[0].toFixed(2) ?? '—'}`,
      icon: Activity,
      color: 'text-emerald-400',
    },
    {
      label: 'Memory',
      value: stats ? `${stats.memory.percent}%` : '—',
      sub: stats ? `${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}` : '—',
      icon: Server,
      color: 'text-blue-400',
    },
    {
      label: 'Disk',
      value: stats ? `${stats.disk.percent}%` : '—',
      sub: stats ? `${formatBytes(stats.disk.used)} / ${formatBytes(stats.disk.total)}` : '—',
      icon: HardDrive,
      color: 'text-amber-400',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-xl font-semibold">Dashboard</h1>
        <p className="text-[#64748b] text-sm mt-0.5">Server overview and real-time metrics</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#64748b] text-xs font-medium">{card.label}</span>
              <card.icon size={16} className={card.color} />
            </div>
            <p className="text-white text-2xl font-bold">{card.value}</p>
            {card.sub && <p className="text-[#64748b] text-xs mt-1">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* CPU / Memory chart */}
      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
        <h2 className="text-white text-sm font-medium mb-4">CPU & Memory — Live</h2>
        {cpuHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={cpuHistory}>
              <defs>
                <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e2130', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="cpu" stroke="#6366f1" fill="url(#cpu)" strokeWidth={2} name="CPU %" />
              <Area type="monotone" dataKey="mem" stroke="#10b981" fill="url(#mem)" strokeWidth={2} name="Mem %" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-[#64748b] text-sm">
            Connecting to live stats...
          </div>
        )}
      </div>

      {/* Account status breakdown */}
      {accountStats && (
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4">
          <h2 className="text-white text-sm font-medium mb-4">Account Status</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Active', value: accountStats.active, color: 'text-emerald-400' },
              { label: 'Suspended', value: accountStats.suspended, color: 'text-amber-400' },
              { label: 'Terminated', value: accountStats.terminated, color: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[#64748b] text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
