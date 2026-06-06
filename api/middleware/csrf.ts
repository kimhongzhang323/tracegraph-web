import type { Context, Next } from 'hono'
import { validateCsrf } from '../lib/csrf.js'
import { getCsrfCookieValue } from '../lib/cookies.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export async function csrfMiddleware(c: Context, next: Next) {
  if (SAFE_METHODS.has(c.req.method)) return next()

  // Skip CSRF validation for public auth endpoints (except logout)
  const path = c.req.path
  if (path.startsWith('/api/auth') && path !== '/api/auth/logout') {
    return next()
  }

  const cookieVal = getCsrfCookieValue(c)
  const headerVal = c.req.header('x-csrf-token')

  if (!validateCsrf(headerVal, cookieVal)) {
    return c.json({ error: 'Invalid CSRF token' }, 403)
  }

  return next()
}
