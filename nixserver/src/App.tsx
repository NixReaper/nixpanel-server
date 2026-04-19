import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Packages from './pages/Packages'
import Setup from './pages/Setup'
import { accountsModule } from './modules/accounts'

const Resellers = React.lazy(() => import('./pages/Resellers'))
const DNS = React.lazy(() => import('./pages/DNS'))
const Email = React.lazy(() => import('./pages/Email'))
const SSL = React.lazy(() => import('./pages/SSL'))
const PHP = React.lazy(() => import('./pages/PHP'))
const Services = React.lazy(() => import('./pages/Services'))
const Backup = React.lazy(() => import('./pages/Backup'))
const Security = React.lazy(() => import('./pages/Security'))
const System = React.lazy(() => import('./pages/System'))
const WebServer = React.lazy(() => import('./pages/WebServer'))

const ServerConfiguration = React.lazy(() => import('./pages/server-configuration/index'))
const SCBasicSetup = React.lazy(() => import('./pages/server-configuration/BasicSetup'))
const SCChangeRoot = React.lazy(() => import('./pages/server-configuration/ChangeRoot'))
const SCAnalytics = React.lazy(() => import('./pages/server-configuration/Analytics'))
const SCCronJobs = React.lazy(() => import('./pages/server-configuration/CronJobs'))
const SCQuotaSetup = React.lazy(() => import('./pages/server-configuration/QuotaSetup'))
const SCLinkNodes = React.lazy(() => import('./pages/server-configuration/LinkNodes'))
const SCServerProfile = React.lazy(() => import('./pages/server-configuration/ServerProfile'))
const SCServerTime = React.lazy(() => import('./pages/server-configuration/ServerTime'))
const SCStatisticsSoftware = React.lazy(() => import('./pages/server-configuration/StatisticsSoftware'))
const SCTerminal = React.lazy(() => import('./pages/server-configuration/Terminal'))
const SCTweakSettings = React.lazy(() => import('./pages/server-configuration/TweakSettings'))
const SCUpdatePreferences = React.lazy(() => import('./pages/server-configuration/UpdatePreferences'))
const SCMarketplace = React.lazy(() => import('./pages/server-configuration/Marketplace'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, setupComplete } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'admin' && !setupComplete) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, setupComplete, hasModule } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/setup" element={
        !user
          ? <Navigate to="/login" replace />
          : setupComplete
            ? <Navigate to="/" replace />
            : <Setup />
      } />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />

        {hasModule('accounts') && (
          <>
            {accountsModule.routes?.map(route => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </>
        )}

        {hasModule('server-configuration') && (
          <>
            <Route path="server-configuration" element={<React.Suspense fallback={<PageLoader />}><ServerConfiguration /></React.Suspense>} />
            <Route path="server-configuration/basic-setup" element={<React.Suspense fallback={<PageLoader />}><SCBasicSetup /></React.Suspense>} />
            <Route path="server-configuration/change-root" element={<React.Suspense fallback={<PageLoader />}><SCChangeRoot /></React.Suspense>} />
            <Route path="server-configuration/analytics" element={<React.Suspense fallback={<PageLoader />}><SCAnalytics /></React.Suspense>} />
            <Route path="server-configuration/cron-jobs" element={<React.Suspense fallback={<PageLoader />}><SCCronJobs /></React.Suspense>} />
            <Route path="server-configuration/quota-setup" element={<React.Suspense fallback={<PageLoader />}><SCQuotaSetup /></React.Suspense>} />
            <Route path="server-configuration/link-nodes" element={<React.Suspense fallback={<PageLoader />}><SCLinkNodes /></React.Suspense>} />
            <Route path="server-configuration/server-profile" element={<React.Suspense fallback={<PageLoader />}><SCServerProfile /></React.Suspense>} />
            <Route path="server-configuration/server-time" element={<React.Suspense fallback={<PageLoader />}><SCServerTime /></React.Suspense>} />
            <Route path="server-configuration/statistics-software" element={<React.Suspense fallback={<PageLoader />}><SCStatisticsSoftware /></React.Suspense>} />
            <Route path="server-configuration/terminal" element={<React.Suspense fallback={<PageLoader />}><SCTerminal /></React.Suspense>} />
            <Route path="server-configuration/tweak-settings" element={<React.Suspense fallback={<PageLoader />}><SCTweakSettings /></React.Suspense>} />
            <Route path="server-configuration/update-preferences" element={<React.Suspense fallback={<PageLoader />}><SCUpdatePreferences /></React.Suspense>} />
            <Route path="server-configuration/marketplace" element={<React.Suspense fallback={<PageLoader />}><SCMarketplace /></React.Suspense>} />
            <Route path="settings" element={<Navigate to="/server-configuration/basic-setup" replace />} />
          </>
        )}

        {hasModule('packages') && <Route path="packages" element={<Packages />} />}
        {hasModule('resellers') && <Route path="resellers" element={<React.Suspense fallback={<PageLoader />}><Resellers /></React.Suspense>} />}
        {hasModule('dns') && <Route path="dns" element={<React.Suspense fallback={<PageLoader />}><DNS /></React.Suspense>} />}
        {hasModule('email') && <Route path="email" element={<React.Suspense fallback={<PageLoader />}><Email /></React.Suspense>} />}
        {hasModule('ssl') && <Route path="ssl" element={<React.Suspense fallback={<PageLoader />}><SSL /></React.Suspense>} />}
        {hasModule('php') && <Route path="php" element={<React.Suspense fallback={<PageLoader />}><PHP /></React.Suspense>} />}
        {hasModule('services') && <Route path="services" element={<React.Suspense fallback={<PageLoader />}><Services /></React.Suspense>} />}
        {hasModule('backup') && <Route path="backup" element={<React.Suspense fallback={<PageLoader />}><Backup /></React.Suspense>} />}
        {hasModule('security') && <Route path="security" element={<React.Suspense fallback={<PageLoader />}><Security /></React.Suspense>} />}
        {hasModule('system') && <Route path="system" element={<React.Suspense fallback={<PageLoader />}><System /></React.Suspense>} />}
        {hasModule('webserver') && <Route path="webserver" element={<React.Suspense fallback={<PageLoader />}><WebServer /></React.Suspense>} />}
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
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
