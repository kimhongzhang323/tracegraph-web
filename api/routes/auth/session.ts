import { Hono } from 'hono'
import { db, sessions } from '../../db/index.js'
import { eq, lt } from 'drizzle-orm'
import { clearAuthCookies, getSessionToken } from '../../lib/cookies.js'
import { hashToken } from '../../lib/tokens.js'
import { requireAuth } from '../../middleware/session.js'
import { audit } from '../../lib/audit.js'
import { getRedis } from '../../lib/redis.js'

export const sessionRouter = new Hono()

const ip = (c: { req: { header: (h: string) => string | undefined } }) =>
  c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

sessionRouter.post('/logout', async (c) => {
  const token = getSessionToken(c)
  if (token) {
    const now = new Date()
    const tokenHash = hashToken(token)
    const redis = getRedis()
    if (redis) {
      await redis.del(`sess:${tokenHash}`).catch(() => {})
    }
    const [sess] = await db.select({ id: sessions.id, userId: sessions.userId }).from(sessions).where(eq(sessions.sessionTokenHash, tokenHash)).limit(1)
    if (sess) {
      await db.update(sessions).set({ revokedAt: now }).where(eq(sessions.id, sess.id))
      await audit('logout', { userId: sess.userId, ip: ip(c) })
    }
  }
  clearAuthCookies(c)
  return c.json({ ok: true })
})

sessionRouter.post('/logout-all', async (c) => {
  const session = requireAuth(c)
  const token = getSessionToken(c)
  if (token) {
    const tokenHash = hashToken(token)
    const redis = getRedis()
    if (redis) {
      await redis.del(`sess:${tokenHash}`).catch(() => {})
    }
  }
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, session.userId))
  clearAuthCookies(c)
  await audit('logout.all', { userId: session.userId, ip: ip(c) })
  return c.json({ ok: true })
})

// Nightly cron: clean up expired/revoked sessions and email tokens
sessionRouter.get('/cron/session-gc', async (c) => {
  if (c.req.header('authorization') !== `Bearer ${process.env.CRON_SECRET ?? ''}`) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000)
  await db.delete(sessions).where(lt(sessions.expiresAt, cutoff))
  return c.json({ ok: true })
})
