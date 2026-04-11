import { Server } from 'lucide-react'
import { TextInput, get } from './FormControls'

const NS_KEYS = ['NS', 'NS2', 'NS3', 'NS4'] as const
const NS_LABELS: Record<string, string> = {
  NS:  'Nameserver 1',
  NS2: 'Nameserver 2',
  NS3: 'Nameserver 3 (optional)',
  NS4: 'Nameserver 4 (optional)',
}
const NS_PLACEHOLDERS: Record<string, string> = {
  NS:  'ns1.example.com',
  NS2: 'ns2.example.com',
  NS3: '',
  NS4: '',
}

interface Props {
  settings: Record<string, string>
  onChange: (key: string, value: string) => void
}

export default function NameserversSection({ settings, onChange }: Props) {
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden mt-6">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2a2d3e]">
        <Server size={16} className="text-indigo-400" />
        <h2 className="text-white font-semibold">Nameservers</h2>
      </div>
      <div className="px-6 py-4">
        {NS_KEYS.map(key => (
          <div
            key={key}
            className="grid grid-cols-[280px_1fr_auto] gap-4 items-center py-3 border-b border-[#1e2130] last:border-0"
          >
            <div className="text-[#cbd5e1] text-sm font-medium">{NS_LABELS[key]}</div>
            <TextInput
              value={get(settings, key)}
              onChange={v => onChange(key, v)}
              placeholder={NS_PLACEHOLDERS[key]}
            />
            <button
              type="button"
              onClick={() => {
                const ns = get(settings, key)
                if (ns) alert(`Configure A record for ${ns} — DNS management coming soon.`)
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 rounded px-3 py-1.5 whitespace-nowrap transition-colors"
            >
              Configure Address Records
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
