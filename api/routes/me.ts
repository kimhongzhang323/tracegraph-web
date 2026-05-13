import { Hono } from 'hono'
import { requireAuth } from '../middleware/session.js'
import { db, sessions, passkeys } from '../db/index.js'
import { eq, and, gt, isNull } from 'drizzle-orm'

export const meRouter = new Hono()

meRouter.get('/', (c) => {
  const session = requireAuth(c)
  return c.json({
    id: session.userId,
    email: session.email,
    mfaEnabled: session.mfaEnabled,
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
