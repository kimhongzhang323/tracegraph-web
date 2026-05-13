import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useBackendUrl', () => ({
  useBackendUrl: () => ({
    backendUrl: null,
    testing: false,
    saving: false,
    error: null,
    test: vi.fn().mockResolvedValue({ ok: true }),
    save: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
  }),
}))

const { BackendConnect } = await import('./BackendConnect')

describe('BackendConnect', () => {
  it('renders URL input and Connect button', () => {
    render(<MemoryRouter><BackendConnect /></MemoryRouter>)
    expect(screen.getByPlaceholderText('http://localhost:8082')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument()
  })

  it('renders Try Sandbox mode button', () => {
    render(<MemoryRouter><BackendConnect /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Try Sandbox mode' })).toBeInTheDocument()
  })

  it('Connect button is disabled when input is empty', () => {
    render(<MemoryRouter><BackendConnect /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled()
  })
})
