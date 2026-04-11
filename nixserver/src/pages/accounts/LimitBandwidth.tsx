import { Link } from 'react-router-dom'
import { ChevronLeft, Gauge, Clock } from 'lucide-react'

export default function LimitBandwidth() {
  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/accounts" className="flex items-center gap-1 text-[#64748b] hover:text-white transition-colors">
          <ChevronLeft size={14} /> Accounts
        </Link>
        <span className="text-[#2a2d3e]">/</span>
        <span className="text-white">Limit Bandwidth Usage</span>
      </div>
      <div>
        <h1 className="text-white text-xl font-semibold">Limit Bandwidth Usage</h1>
        <p className="text-[#64748b] text-sm">Set per-account bandwidth caps independent of package.</p>
      </div>
      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center">
          <Gauge size={28} className="text-orange-400" />
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock size={14} className="text-orange-400" />
            <span className="text-orange-400 text-sm font-medium">Coming Soon</span>
          </div>
          <p className="text-white font-semibold text-lg mb-1">Limit Bandwidth Usage</p>
          <p className="text-[#64748b] text-sm max-w-sm">
            This feature will allow you to set custom per-account bandwidth caps that override the package-level limits.
          </p>
        </div>
      </div>
    </div>
  )
}
