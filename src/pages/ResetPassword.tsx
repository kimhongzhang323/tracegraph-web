import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { auth } from '@/lib/auth'

export function ResetPassword() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await auth.resetPassword(token, password)
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Reset failed'); return }
      navigate('/sign-in?reset=1')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <p className="text-ink-500 text-sm">Invalid or missing reset token.</p>
    </div>
  )

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-16 bg-ink-50/60 dark:bg-ink-950/40">
      <div className="w-full max-w-sm bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800 rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-semibold text-ink-950 dark:text-white mb-6">Set new password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block"><span className="text-sm text-ink-700 dark:text-ink-300 mb-1 block">New password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8}
              className="w-full h-9 px-3 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-ink-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-ink-950/20" />
          </label>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full h-9 rounded-lg bg-ink-950 dark:bg-white text-white dark:text-ink-950 text-sm font-medium hover:bg-ink-800 dark:hover:bg-ink-100 disabled:opacity-50">
            {loading ? 'Saving…' : 'Set password'}
          </button>
        </form>
      </div>
    </div>
  )
}
