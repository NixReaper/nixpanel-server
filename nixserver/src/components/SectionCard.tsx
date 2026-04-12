import { Link } from 'react-router-dom'
import type { ComponentType } from 'react'

interface SectionCardProps {
  label: string
  description?: string
  to: string
  icon?: ComponentType<{ size?: number; className?: string }>
  comingSoon?: boolean
}

export default function SectionCard({ label, description, to, icon: Icon, comingSoon }: SectionCardProps) {
  if (comingSoon) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl border border-[#2a2d3e] bg-[#0f1117] opacity-50 cursor-not-allowed select-none">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-[#1e2130] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon size={15} className="text-[#475569]" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[#64748b] text-sm font-medium truncate">{label}</p>
          {description && <p className="text-[#374151] text-xs mt-0.5 line-clamp-2">{description}</p>}
          <span className="inline-block mt-1 text-[10px] text-[#374151] border border-[#2a2d3e] rounded px-1.5 py-0.5">Coming soon</span>
        </div>
      </div>
    )
  }

  return (
    <Link
      to={to}
      className="flex items-start gap-3 p-4 rounded-xl border border-[#2a2d3e] bg-[#0f1117] hover:bg-[#1a1d27] hover:border-indigo-500/40 transition-colors group"
    >
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-indigo-600/20 transition-colors">
          <Icon size={15} className="text-indigo-400" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[#cbd5e1] text-sm font-medium truncate group-hover:text-white transition-colors">{label}</p>
        {description && <p className="text-[#475569] text-xs mt-0.5 line-clamp-2">{description}</p>}
      </div>
    </Link>
  )
}
