import { Wrench } from 'lucide-react'

interface ComingSoonProps {
  title: string
  description?: string
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-white text-xl font-semibold">{title}</h1>
        {description && <p className="text-[#64748b] text-sm mt-0.5">{description}</p>}
      </div>
      <div className="flex flex-col items-center justify-center py-20 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#0f1117] border border-[#2a2d3e] flex items-center justify-center">
          <Wrench size={24} className="text-[#475569]" />
        </div>
        <div>
          <p className="text-[#94a3b8] font-medium">Coming Soon</p>
          <p className="text-[#475569] text-sm mt-1">This feature is under development.</p>
        </div>
      </div>
    </div>
  )
}
