import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/authContext'

export function VerifyEmail() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const token = params.get('token') ?? ''

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    fetch('/api/auth/verify-email', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': document.cookie.match(/__Host-csrf=([^;]+)/)?.[1] ?? '' },
      body: JSON.stringify({ token }),
    }).then(async (res) => {
      if (res.ok) {
        await refresh()
        setStatus('ok')
        setTimeout(() => navigate('/trace'), 1500)
      } else {
        setStatus('error')
      }
    }).catch(() => setStatus('error'))
  }, [token, navigate, refresh])

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-16 bg-ink-50/60 dark:bg-ink-950/40">
      <div className="w-full max-w-sm bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800 rounded-xl shadow-sm p-8 text-center">
        {status === 'loading' && <p className="text-ink-500 text-sm">Verifying…</p>}
        {status === 'ok' && <p className="text-ink-950 dark:text-white font-medium">Email verified! Redirecting…</p>}
        {status === 'error' && <p className="text-red-600 dark:text-red-400 text-sm">Invalid or expired link. <a href="/sign-in" className="underline">Sign in</a></p>}
      </div>
    </div>
  )
}
