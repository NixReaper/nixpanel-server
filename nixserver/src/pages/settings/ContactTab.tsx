import { Field, TextInput, get } from './FormControls'

interface Props {
  settings: Record<string, string>
  onChange: (key: string, value: string) => void
}

export default function ContactTab({ settings, onChange }: Props) {
  return (
    <div>
      <Field
        label="Contact Email Address(es)"
        hint="Separate multiple addresses with spaces. Used for system notifications."
      >
        <TextInput
          value={get(settings, 'CONTACTEMAIL')}
          onChange={v => onChange('CONTACTEMAIL', v)}
          placeholder="admin@example.com"
          type="email"
        />
        <p className="text-[#475569] text-xs mt-1">
          Enter the email address(es) to which you would like server notification messages to be
          sent. Separate multiple addresses with spaces.
        </p>
      </Field>

      <Field label="Email Sender Name" hint="EMAILFROMNAME — Name shown in From: header">
        <TextInput
          value={get(settings, 'EMAILFROMNAME')}
          onChange={v => onChange('EMAILFROMNAME', v)}
          placeholder="NixPanel"
        />
      </Field>

      <Field label="Reply-To Email Address" hint="EMAILREPLYTO — Optional reply-to header">
        <TextInput
          value={get(settings, 'EMAILREPLYTO')}
          onChange={v => onChange('EMAILREPLYTO', v)}
          placeholder="noreply@example.com"
          type="email"
        />
      </Field>

      <Field label="Pager / Cellular Email" hint="CONTACTPAGER — For critical alerts (e.g. SMS gateway)">
        <TextInput
          value={get(settings, 'CONTACTPAGER')}
          onChange={v => onChange('CONTACTPAGER', v)}
          placeholder="5551234567@txt.att.net"
        />
      </Field>

      <Field label="Pushbullet API Token" hint="CONTACTPUSHBULLET — Leave blank to disable">
        <TextInput
          value={get(settings, 'CONTACTPUSHBULLET')}
          onChange={v => onChange('CONTACTPUSHBULLET', v)}
          placeholder="o.xxxxxxxxxxxxxxxxxxxxxx"
          type="password"
        />
      </Field>

      <Field label="Slack Webhook URL(s)" hint="CONTACTSLACK — One URL per line">
        <textarea
          value={get(settings, 'CONTACTSLACK')}
          onChange={e => onChange('CONTACTSLACK', e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          rows={3}
          className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 placeholder-[#374151] resize-y"
        />
      </Field>

      <Field label="POST Notification URL(s)" hint="CONTACTPOSTURL — One URL per line">
        <textarea
          value={get(settings, 'CONTACTPOSTURL')}
          onChange={e => onChange('CONTACTPOSTURL', e.target.value)}
          placeholder="https://example.com/webhook"
          rows={3}
          className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 placeholder-[#374151] resize-y"
        />
      </Field>

      <Field label="ICQ User ID" hint="ICQUSER">
        <TextInput
          value={get(settings, 'ICQUSER')}
          onChange={v => onChange('ICQUSER', v)}
          placeholder="123456789"
        />
      </Field>

      <Field label="ICQ Password" hint="ICQPASS">
        <TextInput
          value={get(settings, 'ICQPASS')}
          onChange={v => onChange('ICQPASS', v)}
          placeholder="••••••••"
          type="password"
        />
      </Field>

      <Field label="ICQ Contact UIDs" hint="CONTACTUIN — UIDs to notify (space-separated)">
        <TextInput
          value={get(settings, 'CONTACTUIN')}
          onChange={v => onChange('CONTACTUIN', v)}
          placeholder="123456789 987654321"
        />
      </Field>
    </div>
  )
}
