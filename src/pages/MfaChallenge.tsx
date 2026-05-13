import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '@/lib/auth'
import { useAuth } from '@/contexts/authContext'

export function MfaChallenge() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { refresh } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await auth.verifyMfa(code)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Invalid code'); return }
      await refresh()
      navigate('/trace')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-16 bg-ink-50/60 dark:bg-ink-950/40">
      <div className="w-full max-w-sm bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800 rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-semibold text-ink-950 dark:text-white mb-2">Two-factor auth</h1>
        <p className="text-sm text-ink-500 mb-6">Enter the 6-digit code from your authenticator app, or a recovery code.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" required
            className="w-full h-9 px-3 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-ink-950 dark:text-white text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-ink-950/20" />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full h-9 rounded-lg bg-ink-950 dark:bg-white text-white dark:text-ink-950 text-sm font-medium hover:bg-ink-800 dark:hover:bg-ink-100 disabled:opacity-50">
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  )
}
