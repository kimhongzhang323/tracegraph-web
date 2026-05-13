// api/middleware/cors.ts
import type { Context, Next } from 'hono'

const ALLOWED_ORIGIN = process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:5173'

export async function corsMiddleware(c: Context, next: Next) {
  const origin = c.req.header('origin') ?? ''

  // Only set CORS headers when origin matches our frontend
  if (origin === ALLOWED_ORIGIN) {
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Access-Control-Allow-Credentials', 'true')
    c.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, x-csrf-token')
    c.header('Vary', 'Origin')
  }

  if (c.req.method === 'OPTIONS') return c.body(null, 204)
  return next()
}
