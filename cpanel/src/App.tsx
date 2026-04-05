import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Overview from './pages/Overview'
import FileManager from './pages/FileManager'
import Databases from './pages/Databases'
import Email from './pages/Email'
import SSL from './pages/SSL'
import Domains from './pages/Domains'
import FTP from './pages/FTP'
import CronJobs from './pages/CronJobs'
import Stats from './pages/Stats'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Overview />} />
        <Route path="files" element={<FileManager />} />
        <Route path="databases" element={<Databases />} />
        <Route path="email" element={<Email />} />
        <Route path="ssl" element={<SSL />} />
        <Route path="domains" element={<Domains />} />
        <Route path="ftp" element={<FTP />} />
        <Route path="cron" element={<CronJobs />} />
        <Route path="stats" element={<Stats />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
