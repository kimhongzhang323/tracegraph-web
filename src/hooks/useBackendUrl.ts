import { useState } from 'react'
import { useAuth } from '@/contexts/authContext'

interface UseBackendUrl {
  backendUrl: string | null
  testing: boolean
  saving: boolean
  error: string | null
  test: (url: string) => Promise<{ ok: boolean; error?: string }>
  save: (url: string | null) => Promise<void>
  clear: () => Promise<void>
}

export function useBackendUrl(): UseBackendUrl {
  const { user, refresh } = useAuth()
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function test(url: string): Promise<{ ok: boolean; error?: string }> {
    setTesting(true)
    setError(null)
    try {
      const res = await fetch('/api/me/backend/test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json() as { ok: boolean; error?: string }
      if (!data.ok) setError(data.error ?? 'Connection failed')
      return data
    } catch {
      const msg = 'Request failed'
      setError(msg)
      return { ok: false, error: msg }
    } finally {
      setTesting(false)
    }
  }

  async function save(url: string | null): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backendUrl: url }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Save failed')
      }
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function clear(): Promise<void> {
    return save(null)
  }

  return {
    backendUrl: user?.backendUrl ?? null,
    testing,
    saving,
    error,
    test,
    save,
    clear,
  }
}
