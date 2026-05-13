import type { Context, Next } from 'hono'

export async function securityHeaders(c: Context, next: Next) {
  await next()

  c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.header('Cross-Origin-Opener-Policy', 'same-origin')
}
