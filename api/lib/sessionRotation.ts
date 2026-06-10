// api/lib/sessionRotation.ts
import { db, sessions } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { generateOpaqueToken, hashToken } from './tokens.js'
import { generateCsrfSecret } from './csrf.js'
import type { Context } from 'hono'
import { getSessionToken, setSessionCookie, setCsrfCookie } from './cookies.js'
import { getRedis } from './redis.js'

export async function rotateSession(c: Context, sessionId: string): Promise<void> {
  const oldToken = getSessionToken(c)
  if (oldToken) {
    const oldTokenHash = hashToken(oldToken)
    const redis = getRedis()
    if (redis) {
      await redis.del(`sess:${oldTokenHash}`).catch(() => {})
    }
  }

  const newToken = generateOpaqueToken(32)
  const newCsrf = generateCsrfSecret()
  await db.update(sessions)
    .set({ sessionTokenHash: hashToken(newToken), csrfSecret: newCsrf })
    .where(eq(sessions.id, sessionId))
  setSessionCookie(c, newToken)
  setCsrfCookie(c, newCsrf)
}
