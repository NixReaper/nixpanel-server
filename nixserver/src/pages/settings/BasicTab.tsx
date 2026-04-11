import { AlertTriangle } from 'lucide-react'
import { Field, TextInput, RadioGroup, get } from './FormControls'

interface Props {
  settings: Record<string, string>
  onChange: (key: string, value: string) => void
  interfaces: string[]
}

export default function BasicTab({ settings, onChange, interfaces }: Props) {
  const ethdev = get(settings, 'ETHDEV')
  const isOther = ethdev !== '' && !interfaces.includes(ethdev)

  return (
    <div>
      <Field label="Shared IPv4 Address" hint="ADDR — Main server IPv4 address">
        <TextInput
          value={get(settings, 'ADDR')}
          onChange={v => onChange('ADDR', v)}
          placeholder="192.168.1.100"
        />
      </Field>

      <Field label="Shared IPv6 Address" hint="ADDR6 — Leave blank if not using IPv6">
        <TextInput
          value={get(settings, 'ADDR6')}
          onChange={v => onChange('ADDR6', v)}
          placeholder="2001:db8::1"
        />
      </Field>

      <Field label="Ethernet Device" hint="ETHDEV — Network interface for IP configuration">
        <div className="flex gap-2">
          <select
            value={isOther ? '__other__' : ethdev}
            onChange={e => {
              if (e.target.value !== '__other__') onChange('ETHDEV', e.target.value)
              else onChange('ETHDEV', '')
            }}
            className="bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">— select —</option>
            {interfaces.map(iface => (
              <option key={iface} value={iface}>{iface}</option>
            ))}
            <option value="__other__">Other…</option>
          </select>
          {isOther && (
            <TextInput
              value={ethdev}
              onChange={v => onChange('ETHDEV', v)}
              placeholder="eth0"
            />
          )}
        </div>
      </Field>

      <Field label="Home Directory" hint="HOMEDIR — Default: /home">
        <TextInput
          value={get(settings, 'HOMEDIR')}
          onChange={v => onChange('HOMEDIR', v)}
          placeholder="/home"
        />
      </Field>

      <Field
        label="Home Directory Prefix Match"
        hint="HOMEMATCH — Must be present in home path. Default: home"
      >
        <TextInput
          value={get(settings, 'HOMEMATCH')}
          onChange={v => onChange('HOMEMATCH', v)}
          placeholder="home"
        />
      </Field>

      <Field
        label="Auto-Create CGI-bin Alias"
        hint="SCRIPTALIAS — Automatically create a cgi-bin for new accounts"
      >
        <RadioGroup
          value={get(settings, 'SCRIPTALIAS')}
          onChange={v => onChange('SCRIPTALIAS', v)}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
      </Field>

      <Field label="DNS TTL" hint="TTL — Time-to-live for DNS records (seconds). Default: 14400">
        <TextInput
          value={get(settings, 'TTL')}
          onChange={v => onChange('TTL', v)}
          placeholder="14400"
        />
      </Field>

      <Field label="Nameserver TTL" hint="NSTTL — Time-to-live for NS records (seconds). Default: 86400">
        <TextInput
          value={get(settings, 'NSTTL')}
          onChange={v => onChange('NSTTL', v)}
          placeholder="86400"
        />
      </Field>

      <Field label="Apache Log Style" hint="LOGSTYLE — Log format used in Apache vhost configs">
        <div className="space-y-2">
          <RadioGroup
            value={get(settings, 'LOGSTYLE')}
            onChange={v => onChange('LOGSTYLE', v)}
            options={[
              { value: 'combined', label: 'Combined' },
              { value: 'common', label: 'Common' },
            ]}
          />
          {get(settings, 'LOGSTYLE') === 'common' && (
            <div className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2 text-yellow-400 text-xs">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                <strong>Warning:</strong> "Common" log format omits the referrer and user-agent
                fields. "Combined" is recommended for most setups.
              </span>
            </div>
          )}
        </div>
      </Field>
    </div>
  )
}
