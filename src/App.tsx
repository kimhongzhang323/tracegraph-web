import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Seo } from '@/components/Seo'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useTheme } from '@/hooks/useTheme'

const Home = lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })))
const Docs = lazy(() => import('@/pages/Docs').then((m) => ({ default: m.Docs })))
const TraceExplorer = lazy(() => import('@/pages/TraceExplorer').then((m) => ({ default: m.TraceExplorer })))
const Studio = lazy(() => import('@/pages/Studio').then((m) => ({ default: m.Studio })))
const Changelog = lazy(() => import('@/pages/Changelog').then((m) => ({ default: m.Changelog })))
const ApiReference = lazy(() => import('@/pages/ApiReference').then((m) => ({ default: m.ApiReference })))
const SignIn = lazy(() => import('@/pages/SignIn').then((m) => ({ default: m.SignIn })))
const SignUp = lazy(() => import('@/pages/SignUp').then((m) => ({ default: m.SignUp })))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('@/pages/ResetPassword').then((m) => ({ default: m.ResetPassword })))
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail').then((m) => ({ default: m.VerifyEmail })))
const MfaChallenge = lazy(() => import('@/pages/MfaChallenge').then((m) => ({ default: m.MfaChallenge })))
const Account = lazy(() => import('@/pages/Account').then((m) => ({ default: m.Account })))

const APP_ROUTES = ['docs', 'trace', 'studio', 'api', 'changelog', 'sign-in', 'sign-up', 'forgot-password', 'reset-password', 'verify-email', 'mfa-challenge', 'account']

function routeId(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0] ?? ''
  return APP_ROUTES.includes(seg) ? seg : 'home'
}

function Layout() {
  const [theme, setTheme] = useTheme()
  const location = useLocation()
  const route = routeId(location.pathname)
  const hideFooter = route === 'trace' || route === 'studio'
  const seo =
    route === 'docs'
      ? { title: 'Docs', description: 'Documentation for TraceGraph.', path: location.pathname, noindex: false }
      : route === 'trace'
        ? { title: 'Trace explorer', description: 'Inspect executions and replay traces.', path: location.pathname, noindex: true }
        : route === 'studio'
          ? { title: 'Studio', description: 'Visualize graph structure.', path: location.pathname, noindex: true }
          : route === 'api'
            ? { title: 'API reference', description: 'REST endpoints for TraceGraph.', path: location.pathname, noindex: false }
            : route === 'changelog'
              ? { title: 'Changelog', description: 'Release notes for TraceGraph.', path: location.pathname, noindex: false }
              : { title: 'Typed agent runtime for the JVM', description: 'TraceGraph is a typed execution-graph runtime for the JVM.', path: '/', noindex: false }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-ink-950">
      <Seo {...seo} />
      <Header route={route} theme={theme} setTheme={setTheme} />
      <main className="flex-1">
        <Suspense fallback={null}>
          <Routes>
            <Route path="/"                 element={<Home />} />
            <Route path="/docs"             element={<Docs />} />
            <Route path="/docs/:id"         element={<Docs />} />
            <Route path="/trace"            element={<ProtectedRoute><TraceExplorer /></ProtectedRoute>} />
            <Route path="/studio"           element={<ProtectedRoute><Studio /></ProtectedRoute>} />
            <Route path="/api"              element={<ApiReference />} />
            <Route path="/changelog"        element={<Changelog />} />
            <Route path="/sign-in"          element={<SignIn />} />
            <Route path="/sign-up"          element={<SignUp />} />
            <Route path="/forgot-password"  element={<ForgotPassword />} />
            <Route path="/reset-password"   element={<ResetPassword />} />
            <Route path="/verify-email"     element={<VerifyEmail />} />
            <Route path="/mfa-challenge"    element={<MfaChallenge />} />
            <Route path="/account"          element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="*"                 element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {!hideFooter && <Footer />}
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
