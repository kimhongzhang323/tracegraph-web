import { createContext, useContext } from 'react'

export interface AuthUser {
  id: string
  email: string
  mfaEnabled: boolean
}

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}
