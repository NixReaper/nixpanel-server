import { Link } from 'react-router-dom'
import { ChevronLeft, FlaskConical, Clock } from 'lucide-react'

export default function DemoMode() {
  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/accounts" className="flex items-center gap-1 text-[#64748b] hover:text-white transition-colors">
          <ChevronLeft size={14} /> Accounts
        </Link>
        <span className="text-[#2a2d3e]">/</span>
        <span className="text-white">Manage Demo Mode</span>
      </div>
      <div>
        <h1 className="text-white text-xl font-semibold">Manage Demo Mode</h1>
        <p className="text-[#64748b] text-sm">Put accounts into read-only demo mode.</p>
      </div>
      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center">
          <FlaskConical size={28} className="text-orange-400" />
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock size={14} className="text-orange-400" />
            <span className="text-orange-400 text-sm font-medium">Coming Soon</span>
          </div>
          <p className="text-white font-semibold text-lg mb-1">Manage Demo Mode</p>
          <p className="text-[#64748b] text-sm max-w-sm">
            This feature will allow you to put hosting accounts into a read-only demo mode, preventing any changes or file modifications.
          </p>
        </div>
      </div>
    </div>
  )
}
