import { Hono } from 'hono'
import { requireAuth } from '../middleware/session.js'
import { mintInternalJwt } from '../lib/jwt.js'

export const proxyRouter = new Hono()

const SPRING_BOOT_URL = (process.env.SPRING_BOOT_URL ?? 'http://localhost:8082').replace(/\/$/, '')

proxyRouter.all('/*', async (c) => {
  const session = requireAuth(c)

  const jwt = await mintInternalJwt(session.userId, session.email)
  const upstreamPath = c.req.path.replace(/^\/api\/traces/, '/tracegraph/traces')
  const url = `${SPRING_BOOT_URL}${upstreamPath}${c.req.url.includes('?') ? '?' + c.req.url.split('?')[1] : ''}`

  const upstreamRes = await fetch(url, {
    method: c.req.method,
    headers: {
      ...Object.fromEntries(c.req.raw.headers),
      Authorization: `Bearer ${jwt}`,
      'x-forwarded-for': c.req.header('x-forwarded-for') ?? '',
    },
    body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : await c.req.raw.arrayBuffer(),
  })

  // SSE passthrough
  const ct = upstreamRes.headers.get('content-type') ?? ''
  if (ct.includes('text/event-stream')) {
    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    return c.body(upstreamRes.body as ReadableStream)
  }

  const body = await upstreamRes.text()
  return c.text(body, upstreamRes.status as 200, {
    'Content-Type': ct,
  })
})
