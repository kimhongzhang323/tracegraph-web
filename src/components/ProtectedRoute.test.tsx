import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithAuth } from '@/test/helpers/renderWithAuth'
import { ProtectedRoute } from './ProtectedRoute'

const Protected = () => (
  <Routes>
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <div>secret content</div>
        </ProtectedRoute>
      }
    />
    <Route path="/sign-in" element={<div>sign in page</div>} />
  </Routes>
)

describe('ProtectedRoute', () => {
  it('renders nothing while loading', () => {
    const { container } = renderWithAuth(<Protected />, { authValue: { loading: true } })
    expect(container).toBeEmptyDOMElement()
  })

  it('redirects to /sign-in when unauthenticated', () => {
    renderWithAuth(<Protected />, { authValue: { user: null, loading: false } })
    expect(screen.getByText('sign in page')).toBeInTheDocument()
    expect(screen.queryByText('secret content')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    renderWithAuth(<Protected />, {
      authValue: { user: { id: 'u1', email: 'test@example.com', mfaEnabled: false, backendUrl: null }, loading: false },
    })
    expect(screen.getByText('secret content')).toBeInTheDocument()
  })
})
