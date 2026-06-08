import type { Context, Next } from 'hono'

const MAX_BODY_BYTES = 64 * 1024 // 64 KB

export async function requestSizeLimit(c: Context, next: Next) {
  const contentLengthHeader = c.req.header('content-length')
  
  if (contentLengthHeader !== undefined) {
    const contentLength = Number(contentLengthHeader)
    if (!isNaN(contentLength) && contentLength > 0) {
      if (contentLength > MAX_BODY_BYTES) {
        return c.json({ error: 'Request body too large' }, 413)
      }
      return next()
    }
  }

  // Handle stream checks for POST/PUT/PATCH when content-length is missing/unreliable
  if (['POST', 'PUT', 'PATCH'].includes(c.req.method) && c.req.raw.body) {
    try {
      const cloned = c.req.raw.clone()
      const reader = cloned.body?.getReader()
      if (reader) {
        let bytesRead = 0
        const startTime = Date.now()
        while (true) {
          // Slow body / Slowloris timeout (15s limit)
          if (Date.now() - startTime > 15000) {
            reader.releaseLock()
            return c.json({ error: 'Request body read timeout' }, 408)
          }
          
          const { done, value } = await reader.read()
          if (done) {
            reader.releaseLock()
            break
          }
          if (value) {
            bytesRead += value.length
            if (bytesRead > MAX_BODY_BYTES) {
              reader.releaseLock()
              return c.json({ error: 'Request body too large' }, 413)
            }
          }
        }
      }
    } catch {
      return c.json({ error: 'Failed to process request body' }, 400)
    }
  }

  return next()
}
