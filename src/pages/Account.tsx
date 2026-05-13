import { useState } from 'react'
import { useAuth } from '@/contexts/authContext'
import { auth } from '@/lib/auth'

export function Account() {
  const { user, refresh } = useAuth()
  const [mfaStep, setMfaStep] = useState<'idle' | 'enrolling' | 'done'>('idle')
  const [totpUri, setTotpUri] = useState('')
  const [enrollCode, setEnrollCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [enrollError, setEnrollError] = useState('')

  async function beginMfa() {
    const res = await auth.mfaEnrollBegin()
    const data = await res.json()
    setTotpUri(data.uri)
    setMfaStep('enrolling')
  }

  async function completeMfa(e: React.FormEvent) {
    e.preventDefault()
    setEnrollError('')
    const res = await auth.mfaEnrollComplete(enrollCode)
    const data = await res.json()
    if (!res.ok) { setEnrollError(data.error ?? 'Invalid code'); return }
    setRecoveryCodes(data.recoveryCodes)
    setMfaStep('done')
    await refresh()
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold text-ink-950 dark:text-white mb-8">Account</h1>

      <section className="border border-ink-200 dark:border-ink-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-ink-950 dark:text-white mb-1">Email</h2>
        <p className="text-sm text-ink-500">{user.email}</p>
      </section>

      <section className="border border-ink-200 dark:border-ink-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-ink-950 dark:text-white mb-3">Two-factor authentication</h2>
        {user.mfaEnabled ? (
          <p className="text-sm text-ink-500">MFA is enabled on your account.</p>
        ) : mfaStep === 'idle' ? (
          <button onClick={beginMfa} className="h-8 px-4 rounded-lg bg-ink-950 dark:bg-white text-white dark:text-ink-950 text-sm font-medium hover:bg-ink-800 dark:hover:bg-ink-100">
            Enable authenticator app
          </button>
        ) : mfaStep === 'enrolling' ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">Scan this URI in your authenticator app:</p>
            <code className="block text-xs break-all bg-ink-50 dark:bg-ink-900 p-3 rounded-lg text-ink-700 dark:text-ink-300">{totpUri}</code>
            <form onSubmit={completeMfa} className="flex gap-2">
              <input type="text" value={enrollCode} onChange={(e) => setEnrollCode(e.target.value)} placeholder="000000" inputMode="numeric" required
                className="h-9 flex-1 px-3 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm text-ink-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-ink-950/20" />
              <button type="submit" className="h-9 px-4 rounded-lg bg-ink-950 dark:bg-white text-white dark:text-ink-950 text-sm font-medium">Verify</button>
            </form>
            {enrollError && <p className="text-sm text-red-600 dark:text-red-400">{enrollError}</p>}
          </div>
        ) : (
          <div>
            <p className="text-sm text-ink-950 dark:text-white font-medium mb-2">Save your recovery codes</p>
            <div className="grid grid-cols-2 gap-1 mb-2">
              {recoveryCodes.map((rc) => <code key={rc} className="text-xs font-mono bg-ink-50 dark:bg-ink-900 px-2 py-1 rounded text-ink-700 dark:text-ink-300">{rc}</code>)}
            </div>
            <p className="text-xs text-ink-400">Store these somewhere safe. Each can only be used once.</p>
          </div>
        )}
      </section>
    </div>
  )
}
