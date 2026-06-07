import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { db, users, emailTokens, sessions } from '../../db/index.js'
import { eq, and, gt, isNull } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '../../lib/argon2.js'
import { generateOpaqueToken, hashToken } from '../../lib/tokens.js'
import { generateCsrfSecret } from '../../lib/csrf.js'
import { setSessionCookie, setCsrfCookie } from '../../lib/cookies.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../../lib/email.js'
import { checkLimit, registerLimiter, loginLimiter, passwordResetLimiter } from '../../lib/ratelimit.js'
import { audit } from '../../lib/audit.js'
import { isLocked, recordFailure, recordSuccess } from '../../lib/lockout.js'
import { parseBody } from '../../middleware/validate.js'
export const passwordRouter = new Hono()

const registerSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(8).max(128),
})

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string(),
})

const ip = (c: { req: { header: (h: string) => string | undefined } }) =>
  c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

passwordRouter.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Invalid input' }, 400)

  const { email, password } = parsed.data
  const clientIp = ip(c)

  const { ok } = await checkLimit(registerLimiter, clientIp, true)
  if (!ok) return c.json({ error: 'Too many requests' }, 429)

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing.length) {
    // Don't reveal account existence — pretend success
    return c.json({ ok: true })
  }

  const passwordHash = await hashPassword(password)
  const [user] = await db.insert(users).values({ email, passwordHash }).returning({ id: users.id })

  const token = generateOpaqueToken()
  const tokenHash = hashToken(token)
  await db.insert(emailTokens).values({
    userId: user.id,
    purpose: 'verify',
    tokenHash,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    ip: clientIp,
  })

  sendVerificationEmail(c, email, token)
  await audit('register.success', { userId: user.id, ip: clientIp })
  return c.json({ ok: true })
})

passwordRouter.post('/verify-email', async (c) => {
  const body = await c.req.json().catch(() => null)
  const token = String(body?.token ?? '')
  if (!token) return c.json({ error: 'Invalid token' }, 400)

  const tokenHash = hashToken(token)
  const now = new Date()

  const [row] = await db
    .select({ id: emailTokens.id, userId: emailTokens.userId, usedAt: emailTokens.usedAt })
    .from(emailTokens)
    .where(and(eq(emailTokens.tokenHash, tokenHash), eq(emailTokens.purpose, 'verify'), gt(emailTokens.expiresAt, now), isNull(emailTokens.usedAt)))
    .limit(1)

  if (!row) return c.json({ error: 'Invalid or expired token' }, 400)

  await db.update(emailTokens).set({ usedAt: now }).where(eq(emailTokens.id, row.id))
  await db.update(users).set({ emailVerifiedAt: now }).where(eq(users.id, row.userId))
  await audit('email.verify', { userId: row.userId })

  const [user] = await db.select({ email: users.email, mfaEnabled: users.mfaEnabled }).from(users).where(eq(users.id, row.userId))
  return createSession(c, row.userId, user.email, user.mfaEnabled, false)
})

passwordRouter.post('/login', async (c) => {
  const parsed = await parseBody(c, loginSchema)
  if ('error' in parsed) return parsed.error

  const { email, password } = parsed.data
  const clientIp = ip(c)

  if (await isLocked(email)) return c.json({ error: 'Too many requests' }, 429)

  const { ok } = await checkLimit(loginLimiter, `${clientIp}:${email}`, true)
  if (!ok) return c.json({ error: 'Too many requests' }, 429)

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, emailVerifiedAt: users.emailVerifiedAt, mfaEnabled: users.mfaEnabled, disabledAt: users.disabledAt })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  const dummyHash = '$argon2id$v=19$m=65536,t=3,p=1$placeholder'
  const valid = user?.passwordHash ? await verifyPassword(user.passwordHash, password) : (await verifyPassword(dummyHash, password), false)

  if (!valid || !user) {
    await recordFailure(email)
    await audit('login.fail', { ip: clientIp, meta: { email } })
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  if (user.disabledAt) return c.json({ error: 'Account disabled' }, 403)
  if (!user.emailVerifiedAt) return c.json({ error: 'Email not verified' }, 403)

  await recordSuccess(email)
  await audit('login.success', { userId: user.id, ip: clientIp })
  return createSession(c, user.id, email, user.mfaEnabled, user.mfaEnabled)
})

passwordRouter.post('/password/forgot', async (c) => {
  const body = await c.req.json().catch(() => null)
  const email = String(body?.email ?? '').toLowerCase()
  const clientIp = ip(c)

  const { ok: limitOk } = await checkLimit(passwordResetLimiter, `${clientIp}:${email}`, true)
  if (!limitOk) return c.json({ error: 'Too many requests' }, 429)

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (user) {
    const token = generateOpaqueToken()
    await db.insert(emailTokens).values({ userId: user.id, purpose: 'reset', tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600 * 1000), ip: clientIp })
    sendPasswordResetEmail(c, email, token)
    await audit('password.reset.request', { userId: user.id, ip: clientIp })
  }

  return c.json({ ok: true })
})

passwordRouter.post('/password/reset', async (c) => {
  const body = await c.req.json().catch(() => null)
  const token = String(body?.token ?? '')
  const password = String(body?.password ?? '')
  if (!token || password.length < 8) return c.json({ error: 'Invalid input' }, 400)

  const tokenHash = hashToken(token)
  const now = new Date()
  const [row] = await db
    .select({ id: emailTokens.id, userId: emailTokens.userId })
    .from(emailTokens)
    .where(and(eq(emailTokens.tokenHash, tokenHash), eq(emailTokens.purpose, 'reset'), gt(emailTokens.expiresAt, now), isNull(emailTokens.usedAt)))
    .limit(1)

  if (!row) return c.json({ error: 'Invalid or expired token' }, 400)

  const passwordHash = await hashPassword(password)
  await db.update(users).set({ passwordHash }).where(eq(users.id, row.userId))
  await db.update(emailTokens).set({ usedAt: now }).where(eq(emailTokens.id, row.id))
  // Revoke all existing sessions after password reset
  await db.update(sessions).set({ revokedAt: now }).where(eq(sessions.userId, row.userId))
  await audit('password.reset.complete', { userId: row.userId })
  return c.json({ ok: true })
})

async function createSession(c: Context, userId: string, email: string, _mfaEnabled: boolean, pendingMfa: boolean) {
  const token = generateOpaqueToken(32)
  const csrfSecret = generateCsrfSecret()
  await db.insert(sessions).values({
    userId,
    sessionTokenHash: hashToken(token),
    csrfSecret,
    userAgent: c.req.header('user-agent'),
    ip: ip(c),
    pendingMfa,
    expiresAt: new Date(Date.now() + 14 * 86400 * 1000),
  })
  setSessionCookie(c, token)
  setCsrfCookie(c, csrfSecret)

  if (pendingMfa) {
    return c.json({ needs_mfa: true })
  }
  return c.json({ ok: true, email })
}

export { createSession }
