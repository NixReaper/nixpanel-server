import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'

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
  markSetupComplete: () => void
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupComplete, setSetupComplete] = useState(true)

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) { setLoading(false); return }
    try {
      const { data } = await api.get('/auth/me')
      if (data.data.role !== 'admin' && data.data.role !== 'reseller') {
        localStorage.clear()
        setLoading(false)
        return
      }
      setUser(data.data)

      // Only admins trigger the setup check
      if (data.data.role === 'admin') {
        const { data: setupData } = await api.get('/nixserver/setup/status')
        setSetupComplete(setupData.data.setupComplete)
      }
    } catch {
      localStorage.clear()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMe() }, [fetchMe])

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password })
    if (data.data.role !== 'admin' && data.data.role !== 'reseller') {
      throw new Error('Access denied — NixServer is for administrators and resellers only')
    }
    localStorage.setItem('access_token', data.data.accessToken)
    localStorage.setItem('refresh_token', data.data.refreshToken)
    setUser(data.data.user)

    // Check setup status after login
    if (data.data.role === 'admin') {
      try {
        const { data: setupData } = await api.get('/nixserver/setup/status')
        setSetupComplete(setupData.data.setupComplete)
      } catch {
        setSetupComplete(true) // fail open — don't block login on setup check failure
      }
    }
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    try { await api.post('/auth/logout', { refreshToken }) } catch {}
    localStorage.clear()
    setUser(null)
    setSetupComplete(true)
  }

  const markSetupComplete = () => setSetupComplete(true)

  return (
    <AuthContext.Provider value={{ user, loading, setupComplete, markSetupComplete, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
