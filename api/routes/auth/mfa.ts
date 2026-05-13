import { Hono } from 'hono'
import { randomBytes } from 'node:crypto'
import { db, users, recoveryCodes, sessions } from '../../db/index.js'
import { eq, and, isNull } from 'drizzle-orm'
import { encryptSecret, decryptSecret, generateTotpSecret, getTotpUri, verifyTotp } from '../../lib/mfa.js'
import { hashCode, verifyCode } from '../../lib/argon2.js'
import { requireAuth } from '../../middleware/session.js'
import { audit } from '../../lib/audit.js'
import { getSessionToken } from '../../lib/cookies.js'
import { hashToken } from '../../lib/tokens.js'
import { rotateSession } from '../../lib/sessionRotation.js'

export const mfaRouter = new Hono()

const ip = (c: { req: { header: (h: string) => string | undefined } }) =>
  c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

mfaRouter.post('/mfa/enroll/begin', async (c) => {
  const session = requireAuth(c)
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, session.userId))
  const secret = generateTotpSecret()
  const uri = getTotpUri(secret, user.email)
  // Temporarily store encrypted secret until confirmed
  const enc = encryptSecret(secret)
  await db.update(users).set({ mfaSecretEnc: enc }).where(eq(users.id, session.userId))
  return c.json({ uri, secret })
})

mfaRouter.post('/mfa/enroll/complete', async (c) => {
  const session = requireAuth(c)
  const body = await c.req.json().catch(() => null)
  const code = String(body?.code ?? '')

  const [user] = await db.select({ mfaSecretEnc: users.mfaSecretEnc }).from(users).where(eq(users.id, session.userId))
  if (!user?.mfaSecretEnc) return c.json({ error: 'No pending enrollment' }, 400)

  const secret = decryptSecret(user.mfaSecretEnc)
  if (!verifyTotp(secret, code)) return c.json({ error: 'Invalid code' }, 400)

  await db.update(users).set({ mfaEnabled: true }).where(eq(users.id, session.userId))

  // Generate 10 recovery codes
  const rawCodes = Array.from({ length: 10 }, () => randomBytes(5).toString('hex'))
  const hashed = await Promise.all(rawCodes.map((rc) => hashCode(rc)))
  await db.insert(recoveryCodes).values(hashed.map((codeHash) => ({ userId: session.userId, codeHash })))

  await audit('mfa.enroll', { userId: session.userId, ip: ip(c) })
  return c.json({ recoveryCodes: rawCodes })
})

mfaRouter.post('/mfa/verify', async (c) => {
  const sessionToken = getSessionToken(c)
  if (!sessionToken) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json().catch(() => null)
  const code = String(body?.code ?? '')

  // Load session including pending ones
  const tokenHash = hashToken(sessionToken)
  const [sess] = await db
    .select({ id: sessions.id, userId: sessions.userId, pendingMfa: sessions.pendingMfa })
    .from(sessions)
    .where(eq(sessions.sessionTokenHash, tokenHash))
    .limit(1)

  if (!sess?.pendingMfa) return c.json({ error: 'Not in MFA flow' }, 400)

  const [user] = await db.select({ mfaSecretEnc: users.mfaSecretEnc, email: users.email }).from(users).where(eq(users.id, sess.userId))

  // Try TOTP
  if (user.mfaSecretEnc) {
    const secret = decryptSecret(user.mfaSecretEnc)
    if (verifyTotp(secret, code)) {
      await db.update(sessions).set({ pendingMfa: false }).where(eq(sessions.id, sess.id))
      await rotateSession(c, sess.id)
      await audit('login.mfa.success', { userId: sess.userId, ip: ip(c) })
      return c.json({ ok: true, email: user.email })
    }
  }

  // Try recovery code
  const allCodes = await db.select({ id: recoveryCodes.id, codeHash: recoveryCodes.codeHash })
    .from(recoveryCodes).where(and(eq(recoveryCodes.userId, sess.userId), isNull(recoveryCodes.usedAt)))

  for (const rc of allCodes) {
    if (await verifyCode(rc.codeHash, code)) {
      await db.update(recoveryCodes).set({ usedAt: new Date() }).where(eq(recoveryCodes.id, rc.id))
      await db.update(sessions).set({ pendingMfa: false }).where(eq(sessions.id, sess.id))
      await rotateSession(c, sess.id)
      await audit('recovery.use', { userId: sess.userId, ip: ip(c) })
      return c.json({ ok: true, email: user.email })
    }
  }

  await audit('login.mfa.fail', { userId: sess.userId, ip: ip(c) })
  return c.json({ error: 'Invalid code' }, 401)
})
