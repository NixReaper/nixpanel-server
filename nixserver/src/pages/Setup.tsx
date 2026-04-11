import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server, Globe, ShieldCheck, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

const STEPS = [
  { id: 1, label: 'Server',      icon: Server },
  { id: 2, label: 'Nameservers', icon: Globe },
  { id: 3, label: 'Admin',       icon: ShieldCheck },
  { id: 4, label: 'Finish',      icon: CheckCircle },
]

interface FormData {
  hostname: string
  nameserver1: string
  nameserver2: string
  adminEmail: string
  adminPassword: string
  confirmPassword: string
}

export default function Setup() {
  const { user, markSetupComplete } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<FormData>({
    hostname: '',
    nameserver1: '',
    nameserver2: '',
    adminEmail: user?.email ?? '',
    adminPassword: '',
    confirmPassword: '',
  })

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  // ── Validation per step ──────────────────────────────────────────────────────
  function validate(): string {
    if (step === 1) {
      if (!form.hostname.trim()) return 'Hostname is required'
      if (!/^[a-zA-Z0-9.-]+$/.test(form.hostname)) return 'Invalid hostname format'
    }
    if (step === 2) {
      if (!form.nameserver1.trim()) return 'Primary nameserver is required'
      if (!form.nameserver2.trim()) return 'Secondary nameserver is required'
    }
    if (step === 3) {
      if (!form.adminEmail.trim()) return 'Email is required'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) return 'Invalid email address'
      if (form.adminPassword && form.adminPassword.length < 8) return 'Password must be at least 8 characters'
      if (form.adminPassword !== form.confirmPassword) return 'Passwords do not match'
    }
    return ''
  }

  function next() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  function back() {
    setError('')
    setStep(s => s - 1)
  }

  async function finish() {
    setSaving(true)
    setError('')
    try {
      await api.post('/nixserver/setup/complete', {
        hostname:        form.hostname,
        nameserver1:     form.nameserver1,
        nameserver2:     form.nameserver2,
        adminEmail:      form.adminEmail,
        adminPassword:   form.adminPassword || undefined,
        confirmPassword: form.confirmPassword || undefined,
      })
      markSetupComplete()
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Failed to save setup — please try again')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-3">
            <Server size={24} className="text-white" />
          </div>
          <h1 className="text-white text-xl font-bold">NixServer Setup</h1>
          <p className="text-[#64748b] text-sm mt-1">Configure your server before getting started</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const active   = step === s.id
            const complete = step > s.id
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`
                    w-9 h-9 rounded-full flex items-center justify-center transition-colors
                    ${complete ? 'bg-indigo-600'           : active ? 'bg-indigo-600/30 ring-2 ring-indigo-500' : 'bg-[#1a1d27]'}
                  `}>
                    <Icon size={16} className={complete || active ? 'text-indigo-300' : 'text-[#475569]'} />
                  </div>
                  <span className={`text-xs ${active ? 'text-indigo-400' : complete ? 'text-[#94a3b8]' : 'text-[#475569]'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-8 mb-4 ${step > s.id ? 'bg-indigo-600' : 'bg-[#2a2d3e]'}`} />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Card */}
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-6">

          {/* Step 1 — Server Identity */}
          {step === 1 && <>
            <h2 className="text-white text-lg font-semibold mb-1">Server Identity</h2>
            <p className="text-[#64748b] text-sm mb-6">Set the fully-qualified hostname for this server.</p>
            <Field label="Hostname (FQDN)" placeholder="server.example.com" value={form.hostname} onChange={set('hostname')} autoFocus />
            <p className="text-[#64748b] text-xs mt-2">
              Example: <span className="text-[#94a3b8]">server.yourdomain.com</span>
            </p>
          </>}

          {/* Step 2 — Nameservers */}
          {step === 2 && <>
            <h2 className="text-white text-lg font-semibold mb-1">Nameservers</h2>
            <p className="text-[#64748b] text-sm mb-6">These nameservers will be used for hosted domains.</p>
            <Field label="Primary Nameserver (NS1)" placeholder="ns1.yourdomain.com" value={form.nameserver1} onChange={set('nameserver1')} autoFocus />
            <div className="mt-4">
              <Field label="Secondary Nameserver (NS2)" placeholder="ns2.yourdomain.com" value={form.nameserver2} onChange={set('nameserver2')} />
            </div>
          </>}

          {/* Step 3 — Admin Account */}
          {step === 3 && <>
            <h2 className="text-white text-lg font-semibold mb-1">Admin Account</h2>
            <p className="text-[#64748b] text-sm mb-6">Update your admin email and optionally set a new password.</p>
            <Field label="Admin Email" type="email" placeholder="admin@yourdomain.com" value={form.adminEmail} onChange={set('adminEmail')} autoFocus />
            <div className="mt-4">
              <Field label="New Password (optional)" type="password" placeholder="Leave blank to keep current" value={form.adminPassword} onChange={set('adminPassword')} />
            </div>
            <div className="mt-4">
              <Field label="Confirm Password" type="password" placeholder="Re-enter new password" value={form.confirmPassword} onChange={set('confirmPassword')} />
            </div>
          </>}

          {/* Step 4 — Review */}
          {step === 4 && <>
            <h2 className="text-white text-lg font-semibold mb-1">Review & Finish</h2>
            <p className="text-[#64748b] text-sm mb-6">Confirm your settings before applying them.</p>
            <div className="space-y-3">
              <ReviewRow label="Hostname"              value={form.hostname} />
              <ReviewRow label="Primary Nameserver"    value={form.nameserver1} />
              <ReviewRow label="Secondary Nameserver"  value={form.nameserver2} />
              <ReviewRow label="Admin Email"           value={form.adminEmail} />
              <ReviewRow label="Admin Password"        value={form.adminPassword ? '••••••••' : '(unchanged)'} />
            </div>
          </>}

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <button
              onClick={back}
              disabled={step === 1}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-[#94a3b8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>

            {step < 4 ? (
              <button
                onClick={next}
                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Finish Setup'}
                {!saving && <CheckCircle size={16} />}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[#64748b] text-xs mt-4">
          NixServer v0.3.2 · You can revisit these settings anytime under Settings
        </p>
      </div>
    </div>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = 'text', autoFocus,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  autoFocus?: boolean
}) {
  return (
    <div>
      <label className="block text-[#94a3b8] text-xs font-medium mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-[#0f1117] border border-[#2a2d3e] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-[#475569]"
      />
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-[#2a2d3e] last:border-0">
      <span className="text-[#64748b] text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  )
}
