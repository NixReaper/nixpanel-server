import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'

interface User {
  id: number
  username: string
  email: string
  domain: string
  role: 'user'
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) { setLoading(false); return }
    try {
      const { data } = await api.get('/auth/me')
      if (data.data.role !== 'user') { localStorage.clear(); setLoading(false); return }
      setUser(data.data)
    } catch {
      localStorage.clear()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMe() }, [fetchMe])

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password })
    if (data.data.role !== 'user') throw new Error('Use WHM to log in as admin or reseller')
    localStorage.setItem('access_token', data.data.accessToken)
    localStorage.setItem('refresh_token', data.data.refreshToken)
    setUser(data.data.user)
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    try { await api.post('/auth/logout', { refreshToken }) } catch {}
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
