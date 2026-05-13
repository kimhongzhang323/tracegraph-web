import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { AuthContext } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<import('./authContext').AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'include' })
      if (res.ok) {
        setUser(await res.json())
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const signOut = useCallback(async () => {
    const csrf = document.cookie.match(/__Host-csrf=([^;]+)/)?.[1] ?? ''
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', headers: { 'x-csrf-token': csrf } })
    setUser(null)
    window.location.href = '/'
  }, [])

  return <AuthContext.Provider value={{ user, loading, signOut, refresh }}>{children}</AuthContext.Provider>
}
