import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { auth } from '@/lib/auth'
import { useAuth } from '@/contexts/authContext'
import { AuthLayout } from '@/components/AuthLayout'

export function SignIn() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [magicSent, setMagicSent] = useState(false)

  const navigate     = useNavigate()
  const location     = useLocation()
  const { refresh }  = useAuth()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/trace'

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await auth.login(email, password)
      const data = await res.json() as { needs_mfa?: boolean; error?: string }
      if (!res.ok) { setError(data.error ?? 'Invalid credentials'); return }
      if (data.needs_mfa) { navigate('/mfa-challenge'); return }
      await refresh()
      navigate(from, { replace: true })
    } catch {
      setError('Something went wrong — try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first.'); return }
    setError('')
    await auth.requestMagicLink(email).catch(() => {})
    setMagicSent(true)
  }

  return (
    <AuthLayout>
      <h1 className="display-tight text-2xl text-ink-950 dark:text-white mb-1">Welcome back</h1>
      <p className="text-[13px] text-ink-500 mb-8">
        No account?{' '}
        <Link to="/sign-up" className="text-ink-950 dark:text-white underline underline-offset-2 decoration-ink-300 dark:decoration-ink-700 hover:decoration-ink-950 dark:hover:decoration-white transition-all">
          Create one
        </Link>
      </p>

      {/* OAuth */}
      <div className="flex flex-col gap-2 mb-6">
        <OAuthButton href="/api/auth/oauth/google/start" label="Continue with Google" icon={<GoogleIcon />} />
        <OAuthButton href="/api/auth/oauth/github/start" label="Continue with GitHub" icon={<GitHubIcon />} />
      </div>

      <Divider />

      {/* Email + password */}
      <form onSubmit={handlePassword} className="space-y-3 mt-6">
        <Field label="Email" type="email" value={email} onChange={setEmail}
          autoComplete="email" placeholder="you@example.com" />
        <Field label="Password" type="password" value={password} onChange={setPassword}
          autoComplete="current-password" placeholder="••••••••" />

        {error && <p role="alert" className="text-[12px] text-red-600 dark:text-red-400 leading-snug">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full h-10 rounded-xl bg-ink-950 dark:bg-white text-white dark:text-ink-950 text-[13px] font-medium tracking-[-0.01em] hover:bg-ink-800 dark:hover:bg-ink-100 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/40 dark:focus-visible:ring-white/40">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between">
        <button type="button" onClick={handleMagicLink}
          className="text-[12px] text-ink-400 hover:text-ink-950 dark:hover:text-white transition-colors focus-visible:outline-none underline underline-offset-2 decoration-transparent hover:decoration-current">
          {magicSent ? 'Link sent — check your inbox' : 'Email me a sign-in link'}
        </button>
        <Link to="/forgot-password" className="text-[12px] text-ink-400 hover:text-ink-950 dark:hover:text-white transition-colors">
          Forgot password?
        </Link>
      </div>
    </AuthLayout>
  )
}

function Field({ label, type, value, onChange, autoComplete, placeholder }: {
  label: string; type: string; value: string
  onChange: (v: string) => void; autoComplete?: string; placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-ink-500 dark:text-ink-500 mb-1.5 block tracking-widest uppercase">
        {label}
      </span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete} required placeholder={placeholder}
        className="w-full h-10 px-3 rounded-xl border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-900 text-ink-950 dark:text-white text-[13px] placeholder:text-ink-300 dark:placeholder:text-ink-700 focus:outline-none focus:ring-2 focus:ring-ink-950/10 dark:focus:ring-white/10 focus:border-ink-400 dark:focus:border-ink-600 transition-all" />
    </label>
  )
}

function OAuthButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a href={href}
      className="flex items-center justify-center gap-2.5 w-full h-10 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-[13px] text-ink-700 dark:text-ink-300 font-medium hover:bg-ink-50 dark:hover:bg-ink-800 hover:border-ink-300 dark:hover:border-ink-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20">
      {icon}{label}
    </a>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-ink-100 dark:bg-ink-800" />
      <span className="text-[11px] text-ink-400 font-medium uppercase tracking-widest">or</span>
      <div className="flex-1 h-px bg-ink-100 dark:bg-ink-800" />
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-ink-950 dark:text-white">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}
