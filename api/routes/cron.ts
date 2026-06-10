import { Hono } from 'hono'
import { db, sessions, emailTokens, passkeyChallenge, auditLog } from '../db/index.js'
import { lt, or, isNotNull } from 'drizzle-orm'

export const cronRouter = new Hono()

cronRouter.get('/session-gc', async (c) => {
  const authHeader = c.req.header('authorization')
  const expectedSecret = process.env.CRON_SECRET ?? ''

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const now = new Date()

  // 1. Purge expired or revoked sessions
  await db
    .delete(sessions)
    .where(
      or(
        lt(sessions.expiresAt, now),
        isNotNull(sessions.revokedAt)
      )
    )

  // 2. Purge expired or used email tokens
  await db
    .delete(emailTokens)
    .where(
      or(
        lt(emailTokens.expiresAt, now),
        isNotNull(emailTokens.usedAt)
      )
    )

  // 3. Purge expired passkey challenges
  await db
    .delete(passkeyChallenge)
    .where(
      lt(passkeyChallenge.expiresAt, now)
    )

  // 4. Purge audit logs older than 90 days (retention policy)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000)
  await db
    .delete(auditLog)
    .where(
      lt(auditLog.createdAt, ninetyDaysAgo)
    )

  return c.json({ ok: true })
})
