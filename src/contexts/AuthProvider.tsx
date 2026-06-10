import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { AuthContext } from './authContext'
import { api } from '@/lib/api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<import('./authContext').AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api.auth.me()
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const signOut = useCallback(async () => {
    try {
      await api.auth.logout()
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      setUser(null)
      window.location.href = '/'
    }
  }, [])

  return <AuthContext.Provider value={{ user, loading, signOut, refresh }}>{children}</AuthContext.Provider>
}
