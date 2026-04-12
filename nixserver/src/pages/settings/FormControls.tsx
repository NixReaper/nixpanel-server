// Shared form primitives used across Settings tabs

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[280px_1fr] gap-4 items-start py-3 border-b border-[#1e2130] last:border-0">
      <div>
        <div className="text-[#cbd5e1] text-sm font-medium">{label}</div>
        {hint && <div className="text-[#475569] text-xs mt-0.5">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 placeholder-[#374151]"
    />
  )
}

export function RadioGroup({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex gap-6">
      {options.map(opt => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="accent-indigo-500"
          />
          <span className="text-[#cbd5e1] text-sm">{opt.label}</span>
        </label>
      ))}
    </div>
  )
}

export const FIELD_DEFAULTS: Record<string, string> = {
  HOMEDIR: '/home',
  HOMEMATCH: 'home',
  TTL: '14400',
  NSTTL: '86400',
  SCRIPTALIAS: 'yes',
  LOGSTYLE: 'combined',
}

export function get(settings: Record<string, string>, key: string): string {
  return settings[key] ?? FIELD_DEFAULTS[key] ?? ''
}
