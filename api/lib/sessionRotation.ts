// api/lib/sessionRotation.ts
import { db, sessions } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { generateOpaqueToken, hashToken } from './tokens.js'
import { generateCsrfSecret } from './csrf.js'
import type { Context } from 'hono'
import { setSessionCookie, setCsrfCookie } from './cookies.js'

export async function rotateSession(c: Context, sessionId: string): Promise<void> {
  const newToken = generateOpaqueToken(32)
  const newCsrf = generateCsrfSecret()
  await db.update(sessions)
    .set({ sessionTokenHash: hashToken(newToken), csrfSecret: newCsrf })
    .where(eq(sessions.id, sessionId))
  setSessionCookie(c, newToken)
  setCsrfCookie(c, newCsrf)
}
