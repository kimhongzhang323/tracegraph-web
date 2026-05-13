import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '@/contexts/authContext'

const defaults: AuthContextValue = {
  user: null,
  loading: false,
  signOut: async () => {},
  refresh: async () => {},
}

export function renderWithAuth(
  ui: React.ReactNode,
  {
    authValue = {},
    initialPath = '/',
  }: { authValue?: Partial<AuthContextValue>; initialPath?: string } = {},
) {
  return render(
    <AuthContext.Provider value={{ ...defaults, ...authValue }}>
      <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  )
}
