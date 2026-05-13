import { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '@/lib/auth'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await auth.forgotPassword(email).catch(() => {})
    setDone(true)
    setLoading(false)
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-16 bg-ink-50/60 dark:bg-ink-950/40">
      <div className="w-full max-w-sm bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800 rounded-xl shadow-sm p-8">
        {done ? (
          <div className="text-center">
            <p className="text-ink-950 dark:text-white font-medium mb-2">Check your email</p>
            <p className="text-sm text-ink-500 mb-4">If an account exists for <strong>{email}</strong>, we sent a reset link.</p>
            <Link to="/sign-in" className="text-sm text-ink-950 dark:text-white hover:underline">Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-ink-950 dark:text-white mb-6">Reset password</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block"><span className="text-sm text-ink-700 dark:text-ink-300 mb-1 block">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required
                  className="w-full h-9 px-3 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-ink-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-ink-950/20" />
              </label>
              <button type="submit" disabled={loading}
                className="w-full h-9 rounded-lg bg-ink-950 dark:bg-white text-white dark:text-ink-950 text-sm font-medium hover:bg-ink-800 dark:hover:bg-ink-100 disabled:opacity-50">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm"><Link to="/sign-in" className="text-ink-500 hover:text-ink-950 dark:hover:text-white">Back to sign in</Link></p>
          </>
        )}
      </div>
    </div>
  )
}
