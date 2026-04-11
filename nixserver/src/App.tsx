import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
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

// Server Configuration section
const ServerConfiguration     = React.lazy(() => import('./pages/server-configuration/index'))
const SCBasicSetup            = React.lazy(() => import('./pages/server-configuration/BasicSetup'))
const SCChangeRoot            = React.lazy(() => import('./pages/server-configuration/ChangeRoot'))
const SCAnalytics             = React.lazy(() => import('./pages/server-configuration/Analytics'))
const SCCronJobs              = React.lazy(() => import('./pages/server-configuration/CronJobs'))
const SCQuotaSetup            = React.lazy(() => import('./pages/server-configuration/QuotaSetup'))
const SCLinkNodes             = React.lazy(() => import('./pages/server-configuration/LinkNodes'))
const SCServerProfile         = React.lazy(() => import('./pages/server-configuration/ServerProfile'))
const SCServerTime            = React.lazy(() => import('./pages/server-configuration/ServerTime'))
const SCStatisticsSoftware    = React.lazy(() => import('./pages/server-configuration/StatisticsSoftware'))
const SCTerminal              = React.lazy(() => import('./pages/server-configuration/Terminal'))
const SCTweakSettings         = React.lazy(() => import('./pages/server-configuration/TweakSettings'))
const SCUpdatePreferences     = React.lazy(() => import('./pages/server-configuration/UpdatePreferences'))
const SCMarketplace           = React.lazy(() => import('./pages/server-configuration/Marketplace'))

// Accounts sub-pages
const AccountList             = React.lazy(() => import('./pages/accounts/List'))
const AccountParkedDomains    = React.lazy(() => import('./pages/accounts/ParkedDomains'))
const AccountSubdomains       = React.lazy(() => import('./pages/accounts/Subdomains'))
const AccountSuspended        = React.lazy(() => import('./pages/accounts/Suspended'))
const AccountOverQuota        = React.lazy(() => import('./pages/accounts/OverQuota'))
const AccountBandwidth        = React.lazy(() => import('./pages/accounts/Bandwidth'))
const AccountChangeIP         = React.lazy(() => import('./pages/accounts/ChangeIP'))
const AccountEmailUsers       = React.lazy(() => import('./pages/accounts/EmailUsers'))
const AccountForcePassword    = React.lazy(() => import('./pages/accounts/ForcePassword'))
const AccountLimitBandwidth   = React.lazy(() => import('./pages/accounts/LimitBandwidth'))
const AccountSuspension       = React.lazy(() => import('./pages/accounts/Suspension'))
const AccountDemoMode         = React.lazy(() => import('./pages/accounts/DemoMode'))
const AccountShellAccess      = React.lazy(() => import('./pages/accounts/ShellAccess'))
const AccountModify           = React.lazy(() => import('./pages/accounts/Modify'))
const AccountPasswordMod      = React.lazy(() => import('./pages/accounts/PasswordMod'))
const AccountQuotaMod         = React.lazy(() => import('./pages/accounts/QuotaMod'))
const AccountApacheLogs       = React.lazy(() => import('./pages/accounts/ApacheLogs'))
const AccountNginxLogs        = React.lazy(() => import('./pages/accounts/NginxLogs'))
const AccountRearrange        = React.lazy(() => import('./pages/accounts/Rearrange'))
const AccountResetBandwidth   = React.lazy(() => import('./pages/accounts/ResetBandwidth'))
const AccountTerminate        = React.lazy(() => import('./pages/accounts/Terminate'))
const AccountUnsuspendBW      = React.lazy(() => import('./pages/accounts/UnsuspendBandwidth'))
const AccountUpgrade          = React.lazy(() => import('./pages/accounts/Upgrade'))
const AccountWebTemplate      = React.lazy(() => import('./pages/accounts/WebTemplate'))
const AccountBulkIP           = React.lazy(() => import('./pages/accounts/BulkIP'))
const AccountBulkModify       = React.lazy(() => import('./pages/accounts/BulkModify'))

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

        {/* Accounts hub */}
        <Route path="accounts" element={<Accounts />} />
        <Route path="accounts/create" element={<CreateAccount />} />

        {/* Account Information */}
        <Route path="accounts/list" element={
          <React.Suspense fallback={<PageLoader />}><AccountList /></React.Suspense>
        } />
        <Route path="accounts/parked-domains" element={
          <React.Suspense fallback={<PageLoader />}><AccountParkedDomains /></React.Suspense>
        } />
        <Route path="accounts/subdomains" element={
          <React.Suspense fallback={<PageLoader />}><AccountSubdomains /></React.Suspense>
        } />
        <Route path="accounts/suspended" element={
          <React.Suspense fallback={<PageLoader />}><AccountSuspended /></React.Suspense>
        } />
        <Route path="accounts/over-quota" element={
          <React.Suspense fallback={<PageLoader />}><AccountOverQuota /></React.Suspense>
        } />
        <Route path="accounts/bandwidth" element={
          <React.Suspense fallback={<PageLoader />}><AccountBandwidth /></React.Suspense>
        } />

        {/* Account Functions */}
        <Route path="accounts/change-ip" element={
          <React.Suspense fallback={<PageLoader />}><AccountChangeIP /></React.Suspense>
        } />
        <Route path="accounts/email-users" element={
          <React.Suspense fallback={<PageLoader />}><AccountEmailUsers /></React.Suspense>
        } />
        <Route path="accounts/force-password" element={
          <React.Suspense fallback={<PageLoader />}><AccountForcePassword /></React.Suspense>
        } />
        <Route path="accounts/limit-bandwidth" element={
          <React.Suspense fallback={<PageLoader />}><AccountLimitBandwidth /></React.Suspense>
        } />
        <Route path="accounts/suspension" element={
          <React.Suspense fallback={<PageLoader />}><AccountSuspension /></React.Suspense>
        } />
        <Route path="accounts/demo-mode" element={
          <React.Suspense fallback={<PageLoader />}><AccountDemoMode /></React.Suspense>
        } />
        <Route path="accounts/shell-access" element={
          <React.Suspense fallback={<PageLoader />}><AccountShellAccess /></React.Suspense>
        } />
        <Route path="accounts/modify" element={
          <React.Suspense fallback={<PageLoader />}><AccountModify /></React.Suspense>
        } />
        <Route path="accounts/password" element={
          <React.Suspense fallback={<PageLoader />}><AccountPasswordMod /></React.Suspense>
        } />
        <Route path="accounts/quota" element={
          <React.Suspense fallback={<PageLoader />}><AccountQuotaMod /></React.Suspense>
        } />
        <Route path="accounts/apache-logs" element={
          <React.Suspense fallback={<PageLoader />}><AccountApacheLogs /></React.Suspense>
        } />
        <Route path="accounts/nginx-logs" element={
          <React.Suspense fallback={<PageLoader />}><AccountNginxLogs /></React.Suspense>
        } />
        <Route path="accounts/rearrange" element={
          <React.Suspense fallback={<PageLoader />}><AccountRearrange /></React.Suspense>
        } />
        <Route path="accounts/reset-bandwidth" element={
          <React.Suspense fallback={<PageLoader />}><AccountResetBandwidth /></React.Suspense>
        } />
        <Route path="accounts/terminate" element={
          <React.Suspense fallback={<PageLoader />}><AccountTerminate /></React.Suspense>
        } />
        <Route path="accounts/unsuspend-bandwidth" element={
          <React.Suspense fallback={<PageLoader />}><AccountUnsuspendBW /></React.Suspense>
        } />
        <Route path="accounts/upgrade" element={
          <React.Suspense fallback={<PageLoader />}><AccountUpgrade /></React.Suspense>
        } />
        <Route path="accounts/web-template" element={
          <React.Suspense fallback={<PageLoader />}><AccountWebTemplate /></React.Suspense>
        } />

        {/* Multi Account Functions */}
        <Route path="accounts/bulk-ip" element={
          <React.Suspense fallback={<PageLoader />}><AccountBulkIP /></React.Suspense>
        } />
        <Route path="accounts/bulk-modify" element={
          <React.Suspense fallback={<PageLoader />}><AccountBulkModify /></React.Suspense>
        } />

        {/* Server Configuration section */}
        <Route path="server-configuration" element={
          <React.Suspense fallback={<PageLoader />}><ServerConfiguration /></React.Suspense>
        } />
        <Route path="server-configuration/basic-setup" element={
          <React.Suspense fallback={<PageLoader />}><SCBasicSetup /></React.Suspense>
        } />
        <Route path="server-configuration/change-root" element={
          <React.Suspense fallback={<PageLoader />}><SCChangeRoot /></React.Suspense>
        } />
        <Route path="server-configuration/analytics" element={
          <React.Suspense fallback={<PageLoader />}><SCAnalytics /></React.Suspense>
        } />
        <Route path="server-configuration/cron-jobs" element={
          <React.Suspense fallback={<PageLoader />}><SCCronJobs /></React.Suspense>
        } />
        <Route path="server-configuration/quota-setup" element={
          <React.Suspense fallback={<PageLoader />}><SCQuotaSetup /></React.Suspense>
        } />
        <Route path="server-configuration/link-nodes" element={
          <React.Suspense fallback={<PageLoader />}><SCLinkNodes /></React.Suspense>
        } />
        <Route path="server-configuration/server-profile" element={
          <React.Suspense fallback={<PageLoader />}><SCServerProfile /></React.Suspense>
        } />
        <Route path="server-configuration/server-time" element={
          <React.Suspense fallback={<PageLoader />}><SCServerTime /></React.Suspense>
        } />
        <Route path="server-configuration/statistics-software" element={
          <React.Suspense fallback={<PageLoader />}><SCStatisticsSoftware /></React.Suspense>
        } />
        <Route path="server-configuration/terminal" element={
          <React.Suspense fallback={<PageLoader />}><SCTerminal /></React.Suspense>
        } />
        <Route path="server-configuration/tweak-settings" element={
          <React.Suspense fallback={<PageLoader />}><SCTweakSettings /></React.Suspense>
        } />
        <Route path="server-configuration/update-preferences" element={
          <React.Suspense fallback={<PageLoader />}><SCUpdatePreferences /></React.Suspense>
        } />
        <Route path="server-configuration/marketplace" element={
          <React.Suspense fallback={<PageLoader />}><SCMarketplace /></React.Suspense>
        } />
        {/* Redirect old /settings to new canonical route */}
        <Route path="settings" element={<Navigate to="/server-configuration/basic-setup" replace />} />

        {/* Other sections */}
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
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
