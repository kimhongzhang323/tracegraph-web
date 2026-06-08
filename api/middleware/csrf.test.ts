// @vitest-environment node
import { Hono } from 'hono'
import { describe, it, expect } from 'vitest'
import { csrfMiddleware } from './csrf'

describe('csrfMiddleware', () => {
  it('allows safe methods without token', async () => {
    const app = new Hono()
    app.use('*', csrfMiddleware)
    app.get('/api/test', (c) => c.text('safe-get'))
    
    const res = await app.request('/api/test', { method: 'GET' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('safe-get')
  })

  it('allows public pre-auth routes without token', async () => {
    const app = new Hono()
    app.use('*', csrfMiddleware)
    app.post('/api/auth/login', (c) => c.text('login-ok'))
    app.post('/api/auth/register', (c) => c.text('register-ok'))
    app.post('/api/auth/magic-link/request', (c) => c.text('magic-ok'))
    app.post('/api/auth/password/forgot', (c) => c.text('forgot-ok'))
    app.post('/api/auth/password/reset', (c) => c.text('reset-ok'))
    app.post('/api/auth/verify-email', (c) => c.text('verify-ok'))
    app.post('/api/auth/oauth/github/start', (c) => c.text('oauth-ok'))

    for (const path of [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/magic-link/request',
      '/api/auth/password/forgot',
      '/api/auth/password/reset',
      '/api/auth/verify-email',
      '/api/auth/oauth/github/start',
    ]) {
      const res = await app.request(path, { method: 'POST' })
      expect(res.status).toBe(200)
    }
  })

  it('blocks other state-changing routes under /api/auth without valid token', async () => {
    const app = new Hono()
    app.use('*', csrfMiddleware)
    app.post('/api/auth/logout', (c) => c.text('logout-ok'))
    app.post('/api/auth/logout-all', (c) => c.text('logout-all-ok'))
    app.post('/api/auth/mfa/enroll/begin', (c) => c.text('mfa-ok'))

    for (const path of [
      '/api/auth/logout',
      '/api/auth/logout-all',
      '/api/auth/mfa/enroll/begin',
    ]) {
      const res = await app.request(path, { method: 'POST' })
      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ error: 'Invalid CSRF token' })
    }
  })

  it('allows POST when CSRF token matches cookie', async () => {
    const app = new Hono()
    app.use('*', csrfMiddleware)
    app.post('/api/auth/mfa/enroll/begin', (c) => c.text('mfa-ok'))

    const token = 'super-secret-csrf-token'
    const res = await app.request('/api/auth/mfa/enroll/begin', {
      method: 'POST',
      headers: {
        'x-csrf-token': token,
        'Cookie': `__Host-csrf=${token}`,
      },
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('mfa-ok')
  })
})
