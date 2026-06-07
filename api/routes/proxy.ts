import { Hono } from 'hono'
import { requireAuth } from '../middleware/session.js'
import { mintInternalJwt } from '../lib/jwt.js'
import { db, users } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { getCachedResponse, setCachedResponse, invalidateUserCache } from '../lib/cache.js'

export const proxyRouter = new Hono()

const SPRING_BOOT_URL = (process.env.SPRING_BOOT_URL ?? 'http://localhost:8082').replace(/\/$/, '')

proxyRouter.all('/*', async (c) => {
  const session = requireAuth(c)

  const isGet = ['GET', 'HEAD'].includes(c.req.method)
  const path = c.req.path
  const query = c.req.url.includes('?') ? c.req.url.split('?')[1] : ''

  const isCacheable = isGet && (
    path === '/api/traces' ||
    path === '/api/graph/mermaid' ||
    path === '/api/graph/complexity'
  )

  if (isCacheable) {
    const cached = await getCachedResponse(session.userId, path, query)
    if (cached) {
      c.header('x-proxy-cache', 'HIT')
      c.header('Content-Type', cached.contentType)
      c.set('upstreamStatus', cached.status)
      return c.text(cached.body, cached.status as 200)
    }
  }

  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)
  if (isMutation) {
    await invalidateUserCache(session.userId)
  }

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

  if (isCacheable && upstreamRes.status === 200) {
    await setCachedResponse(session.userId, path, query, {
      body,
      contentType: ct,
      status: upstreamRes.status,
    })
  }

  c.header('x-proxy-cache', 'MISS')
  return c.text(body, upstreamRes.status as 200, {
    'Content-Type': ct,
  })
})
