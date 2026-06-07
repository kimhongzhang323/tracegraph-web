import { Hono } from 'hono'
import { requireAuth } from '../middleware/session.js'
import { mintInternalJwt } from '../lib/jwt.js'
import { db, users } from '../db/index.js'
import { eq } from 'drizzle-orm'

export const proxyRouter = new Hono()

const SPRING_BOOT_URL = (process.env.SPRING_BOOT_URL ?? 'http://localhost:8082').replace(/\/$/, '')

proxyRouter.all('/*', async (c) => {
  const session = requireAuth(c)

  const jwt = await mintInternalJwt(session.userId, session.email)

  const [user] = await db
    .select({ backendUrl: users.backendUrl })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)

  const targetUrl = (user?.backendUrl ?? SPRING_BOOT_URL).replace(/\/$/, '')
  
  let upstreamPath = c.req.path
  if (c.req.path.startsWith('/api/traces')) {
    upstreamPath = c.req.path.replace(/^\/api\/traces/, '/tracegraph/traces')
  } else if (c.req.path === '/api/graph/mermaid') {
    upstreamPath = '/tracegraph/ui/graph'
  } else if (c.req.path === '/api/graph/complexity') {
    upstreamPath = '/tracegraph/ui/complexity'
  }

  const url = `${targetUrl}${upstreamPath}${c.req.url.includes('?') ? '?' + c.req.url.split('?')[1] : ''}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  const reqId = c.get('requestId') || ''
  const upstreamRes = await fetch(url, {
    method: c.req.method,
    headers: {
      ...Object.fromEntries(c.req.raw.headers),
      Authorization: `Bearer ${jwt}`,
      'x-forwarded-for': c.req.header('x-forwarded-for') ?? '',
      'x-request-id': reqId,
    },
    body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : await c.req.raw.arrayBuffer(),
    signal: controller.signal,
  }).finally(() => clearTimeout(timer))

  c.set('upstreamStatus', upstreamRes.status)

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
