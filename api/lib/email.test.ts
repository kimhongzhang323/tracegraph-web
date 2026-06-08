// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('email library', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('in development: defaults origin to localhost when WEBAUTHN_ORIGIN is missing', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.WEBAUTHN_ORIGIN
    delete process.env.RESEND_API_KEY

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const mockContext = {} as any

    const { sendVerificationEmail } = await import('./email')
    sendVerificationEmail(mockContext, 'dev@example.com', 'token-123')

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:5173/verify-email?token=token-123')
    )
  })

  it('in production: throws when WEBAUTHN_ORIGIN is missing', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.WEBAUTHN_ORIGIN
    process.env.RESEND_API_KEY = 're_123'

    const mockContext = {} as any
    const { sendVerificationEmail } = await import('./email')
    expect(() => sendVerificationEmail(mockContext, 'prod@example.com', 'token-123')).toThrow(
      'WEBAUTHN_ORIGIN is missing in production'
    )
  })

  it('in production: throws when RESEND_API_KEY is missing', async () => {
    process.env.NODE_ENV = 'production'
    process.env.WEBAUTHN_ORIGIN = 'https://app.tracegraph.site'
    delete process.env.RESEND_API_KEY

    const mockContext = {} as any
    const { sendVerificationEmail } = await import('./email')
    expect(() => sendVerificationEmail(mockContext, 'prod@example.com', 'token-123')).toThrow(
      'RESEND_API_KEY is missing in production'
    )
  })
})
