import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import {
  ALL_NIXSERVER_MODULE_IDS,
  isNixserverModuleId,
  type NixserverModuleId,
  type NixserverModuleInfo,
} from '../modules/catalog'

interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'reseller'
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  setupComplete: boolean
  enabledModules: NixserverModuleId[]
  hasModule: (id: NixserverModuleId) => boolean
  markSetupComplete: () => void
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupComplete, setSetupComplete] = useState(true)
  const [enabledModules, setEnabledModules] = useState<NixserverModuleId[]>(ALL_NIXSERVER_MODULE_IDS)

  const loadModules = useCallback(async () => {
    try {
      const { data } = await api.get('/nixserver/modules')
      const modules = (data.data?.modules ?? []) as NixserverModuleInfo[]
      const next = modules
        .map(module => module.id)
        .filter(isNixserverModuleId)

      setEnabledModules(next.length > 0 ? next : ALL_NIXSERVER_MODULE_IDS)
    } catch {
      // Fail open in the UI; backend route registration remains authoritative.
      setEnabledModules(ALL_NIXSERVER_MODULE_IDS)
    }
  }, [])

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const { data } = await api.get('/auth/me')
      if (data.data.role !== 'admin' && data.data.role !== 'reseller') {
        localStorage.clear()
        setLoading(false)
        return
      }

      setUser(data.data)

      if (data.data.role === 'admin') {
        const { data: setupData } = await api.get('/nixserver/setup/status')
        setSetupComplete(setupData.data.setupComplete)
      }

      await loadModules()
    } catch {
      localStorage.clear()
    } finally {
      setLoading(false)
    }
  }, [loadModules])

  useEffect(() => { fetchMe() }, [fetchMe])

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password })
    if (data.data.role !== 'admin' && data.data.role !== 'reseller') {
      throw new Error('Access denied â€” NixServer is for administrators and resellers only')
    }

    localStorage.setItem('access_token', data.data.accessToken)
    localStorage.setItem('refresh_token', data.data.refreshToken)
    setUser(data.data.user)

    if (data.data.role === 'admin') {
      try {
        const { data: setupData } = await api.get('/nixserver/setup/status')
        setSetupComplete(setupData.data.setupComplete)
      } catch {
        setSetupComplete(true)
      }
    }

    await loadModules()
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    try { await api.post('/auth/logout', { refreshToken }) } catch {}
    localStorage.clear()
    setUser(null)
    setSetupComplete(true)
    setEnabledModules(ALL_NIXSERVER_MODULE_IDS)
  }

  const markSetupComplete = () => setSetupComplete(true)
  const hasModule = (id: NixserverModuleId) => enabledModules.includes(id)

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      setupComplete,
      enabledModules,
      hasModule,
      markSetupComplete,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
