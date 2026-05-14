import { Hono } from 'hono'
import { requireAuth } from '../middleware/session.js'
import { db, sessions, passkeys, users } from '../db/index.js'
import { eq, and, gt, isNull } from 'drizzle-orm'
import { z } from 'zod'

export const meRouter = new Hono()

meRouter.get('/', async (c) => {
  const session = requireAuth(c)
  const [user] = await db
    .select({ backendUrl: users.backendUrl })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)
  return c.json({
    id: session.userId,
    email: session.email,
    mfaEnabled: session.mfaEnabled,
    backendUrl: user?.backendUrl ?? null,
  })
})

meRouter.get('/sessions', async (c) => {
  const session = requireAuth(c)
  const now = new Date()
  const rows = await db
    .select({ id: sessions.id, userAgent: sessions.userAgent, ip: sessions.ip, createdAt: sessions.createdAt, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(and(eq(sessions.userId, session.userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
  return c.json(rows)
})

meRouter.delete('/sessions/:id', async (c) => {
  const session = requireAuth(c)
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.id, c.req.param('id')), eq(sessions.userId, session.userId)))
  return c.json({ ok: true })
})

meRouter.get('/passkeys', async (c) => {
  const session = requireAuth(c)
  const rows = await db
    .select({ id: passkeys.id, deviceLabel: passkeys.deviceLabel, createdAt: passkeys.createdAt, lastUsedAt: passkeys.lastUsedAt })
    .from(passkeys)
    .where(eq(passkeys.userId, session.userId))
  return c.json(rows)
})

meRouter.delete('/passkeys/:id', async (c) => {
  const session = requireAuth(c)
  await db.delete(passkeys).where(and(eq(passkeys.id, c.req.param('id')), eq(passkeys.userId, session.userId)))
  return c.json({ ok: true })
})

const patchMeSchema = z.object({
  backendUrl: z.string().url().max(2048).nullable(),
})

meRouter.patch('/', async (c) => {
  const session = requireAuth(c)
  const body = await c.req.json()
  const parsed = patchMeSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400)
  }
  await db
    .update(users)
    .set({ backendUrl: parsed.data.backendUrl })
    .where(eq(users.id, session.userId))
  return c.json({ backendUrl: parsed.data.backendUrl })
})

const testBackendSchema = z.object({
  url: z.string().url().max(2048),
})

meRouter.post('/backend/test', async (c) => {
  requireAuth(c)
  const body = await c.req.json()
  const parsed = testBackendSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Invalid URL' }, 400)
  }

  const testUrl = `${parsed.data.url.replace(/\/$/, '')}/tracegraph/traces?limit=1`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5_000)

  try {
    const res = await fetch(testUrl, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    })
    clearTimeout(timer)
    if (res.ok || res.status === 401) {
      return c.json({ ok: true })
    }
    return c.json({ ok: false, error: 'Unexpected response' })
  } catch (err) {
    clearTimeout(timer)
    const e = err as Error
    if (e.name === 'AbortError') return c.json({ ok: false, error: 'URL unreachable (timeout)' })
    return c.json({ ok: false, error: 'Connection refused' })
  }
})
