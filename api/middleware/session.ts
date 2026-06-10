import type { Context, Next } from 'hono'
import { db, sessions, users } from '../db/index.js'
import { eq, and, gt, isNull } from 'drizzle-orm'
import { getSessionToken } from '../lib/cookies.js'
import { hashToken } from '../lib/tokens.js'
import { dedupe } from '../lib/inflight.js'
import { getRedis } from '../lib/redis.js'

export interface SessionData {
  sessionId: string
  userId: string
  email: string
  mfaEnabled: boolean
  pendingMfa: boolean
  csrfSecret: string
}

declare module 'hono' {
  interface ContextVariableMap {
    session: SessionData | null
  }
}

export async function sessionMiddleware(c: Context, next: Next) {
  const token = getSessionToken(c)
  if (!token) {
    c.set('session', null)
    return next()
  }

  const tokenHash = hashToken(token)
  const now = new Date()

  const redis = getRedis()
  let row: SessionData | null = null

  if (redis) {
    try {
      row = await redis.get<SessionData>(`sess:${tokenHash}`)
    } catch (err) {
      console.error('Redis session get failed:', err)
    }
  }

  if (!row) {
    row = await dedupe(`session:${tokenHash}`, () =>
      db
        .select({
          sessionId: sessions.id,
          userId: sessions.userId,
          csrfSecret: sessions.csrfSecret,
          pendingMfa: sessions.pendingMfa,
          email: users.email,
          mfaEnabled: users.mfaEnabled,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(
          and(
            eq(sessions.sessionTokenHash, tokenHash),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, now),
          ),
        )
        .limit(1)
        .then((rows) => (rows[0] as SessionData) ?? null),
    )

    if (row && redis) {
      try {
        await redis.set(`sess:${tokenHash}`, row, { ex: 300 })
      } catch (err) {
        console.error('Redis session set failed:', err)
      }
    }
  }

  if (!row) {
    c.set('session', null)
    return next()
  }

  c.set('session', row)
  return next()
}

export function requireAuth(c: Context): SessionData {
  const session = c.get('session')
  if (!session || session.pendingMfa) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }
  return session
}
