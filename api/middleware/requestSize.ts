import type { Context, Next } from 'hono'

const MAX_BODY_BYTES = 64 * 1024 // 64 KB

export async function requestSizeLimit(c: Context, next: Next) {
  const contentLength = Number(c.req.header('content-length') ?? '0')
  if (contentLength > MAX_BODY_BYTES) {
    return c.json({ error: 'Request body too large' }, 413)
  }
  return next()
}
