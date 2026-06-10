import type { Context, Next } from 'hono'
import { validateCsrf } from '../lib/csrf.js'
import { getCsrfCookieValue } from '../lib/cookies.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export async function csrfMiddleware(c: Context, next: Next) {
  if (SAFE_METHODS.has(c.req.method)) return next()

  // Skip CSRF validation only for public, pre-auth routes
  const path = c.req.path
  const PUBLIC_AUTH_PATHS = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/magic-link/request',
    '/api/auth/password/forgot',
    '/api/auth/password/reset',
    '/api/auth/verify-email',
  ])

  if (PUBLIC_AUTH_PATHS.has(path) || path.startsWith('/api/auth/oauth/')) {
    return next()
  }

  const cookieVal = getCsrfCookieValue(c)
  const headerVal = c.req.header('x-csrf-token')

  if (!validateCsrf(headerVal, cookieVal)) {
    return c.json({ error: 'Invalid CSRF token' }, 403)
  }

  return next()
}
