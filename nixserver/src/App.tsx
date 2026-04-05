import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import CreateAccount from './pages/CreateAccount'
import Packages from './pages/Packages'
import Setup from './pages/Setup'

// Lazy-loaded pages (built incrementally)
const Resellers  = React.lazy(() => import('./pages/Resellers'))
const DNS        = React.lazy(() => import('./pages/DNS'))
const Email      = React.lazy(() => import('./pages/Email'))
const SSL        = React.lazy(() => import('./pages/SSL'))
const PHP        = React.lazy(() => import('./pages/PHP'))
const Services   = React.lazy(() => import('./pages/Services'))
const Backup     = React.lazy(() => import('./pages/Backup'))
const Security   = React.lazy(() => import('./pages/Security'))
const System     = React.lazy(() => import('./pages/System'))
const WebServer  = React.lazy(() => import('./pages/WebServer'))
const Settings   = React.lazy(() => import('./pages/Settings'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, setupComplete } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  // Admin must complete first-run setup before accessing the panel
  if (user.role === 'admin' && !setupComplete) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, setupComplete } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      {/* First-run setup — only accessible to authenticated admins who haven't completed setup */}
      <Route path="/setup" element={
        !user
          ? <Navigate to="/login" replace />
          : setupComplete
            ? <Navigate to="/" replace />
            : <Setup />
      } />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="accounts/create" element={<CreateAccount />} />
        <Route path="packages" element={<Packages />} />
        <Route path="resellers" element={
          <React.Suspense fallback={<PageLoader />}><Resellers /></React.Suspense>
        } />
        <Route path="dns" element={
          <React.Suspense fallback={<PageLoader />}><DNS /></React.Suspense>
        } />
        <Route path="email" element={
          <React.Suspense fallback={<PageLoader />}><Email /></React.Suspense>
        } />
        <Route path="ssl" element={
          <React.Suspense fallback={<PageLoader />}><SSL /></React.Suspense>
        } />
        <Route path="php" element={
          <React.Suspense fallback={<PageLoader />}><PHP /></React.Suspense>
        } />
        <Route path="services" element={
          <React.Suspense fallback={<PageLoader />}><Services /></React.Suspense>
        } />
        <Route path="backup" element={
          <React.Suspense fallback={<PageLoader />}><Backup /></React.Suspense>
        } />
        <Route path="security" element={
          <React.Suspense fallback={<PageLoader />}><Security /></React.Suspense>
        } />
        <Route path="system" element={
          <React.Suspense fallback={<PageLoader />}><System /></React.Suspense>
        } />
        <Route path="webserver" element={
          <React.Suspense fallback={<PageLoader />}><WebServer /></React.Suspense>
        } />
        <Route path="settings" element={
          <React.Suspense fallback={<PageLoader />}><Settings /></React.Suspense>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
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
