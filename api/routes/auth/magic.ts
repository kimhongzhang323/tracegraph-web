import { Hono } from 'hono'
import { db, users, emailTokens } from '../../db/index.js'
import { eq, and, gt, isNull } from 'drizzle-orm'
import { generateOpaqueToken, hashToken } from '../../lib/tokens.js'
import { generateCsrfSecret } from '../../lib/csrf.js'
import { setSessionCookie, setCsrfCookie } from '../../lib/cookies.js'
import { sendMagicLinkEmail } from '../../lib/email.js'
import { checkLimit, magicLinkLimiter } from '../../lib/ratelimit.js'
import { audit } from '../../lib/audit.js'

export const magicRouter = new Hono()

const ip = (c: { req: { header: (h: string) => string | undefined } }) =>
  c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

magicRouter.post('/magic-link/request', async (c) => {
  const body = await c.req.json().catch(() => null)
  const email = String(body?.email ?? '').toLowerCase().trim()
  if (!email) return c.json({ ok: true }) // always 200

  const clientIp = ip(c)
  const { ok } = await checkLimit(magicLinkLimiter, `${clientIp}:${email}`, true)
  if (!ok) return c.json({ error: 'Too many requests' }, 429)

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (user) {
    const token = generateOpaqueToken()
    await db.insert(emailTokens).values({
      userId: user.id,
      purpose: 'magic',
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      ip: clientIp,
    })
    sendMagicLinkEmail(c, email, token)
    await audit('magic.request', { userId: user.id, ip: clientIp })
  }

  return c.json({ ok: true })
})

magicRouter.get('/magic-link/consume', async (c) => {
  const token = c.req.query('token') ?? ''
  if (!token) return c.redirect('/sign-in?error=invalid', 302)

  const tokenHash = hashToken(token)
  const now = new Date()

  const [row] = await db
    .select({ id: emailTokens.id, userId: emailTokens.userId })
    .from(emailTokens)
    .where(and(eq(emailTokens.tokenHash, tokenHash), eq(emailTokens.purpose, 'magic'), gt(emailTokens.expiresAt, now), isNull(emailTokens.usedAt)))
    .limit(1)

  if (!row) return c.redirect('/sign-in?error=expired', 302)

  await db.update(emailTokens).set({ usedAt: now }).where(eq(emailTokens.id, row.id))
  await db.update(users).set({ emailVerifiedAt: now }).where(and(eq(users.id, row.userId), isNull(users.emailVerifiedAt)))

  const [user] = await db.select({ email: users.email, mfaEnabled: users.mfaEnabled }).from(users).where(eq(users.id, row.userId))
  const { sessions } = await import('../../db/index.js')
  const sessionToken = generateOpaqueToken(32)
  const csrfSecret = generateCsrfSecret()

  await db.insert(sessions).values({
    userId: row.userId,
    sessionTokenHash: hashToken(sessionToken),
    csrfSecret,
    userAgent: c.req.header('user-agent'),
    ip: ip(c),
    pendingMfa: user.mfaEnabled,
    expiresAt: new Date(Date.now() + 14 * 86400 * 1000),
  })

  setSessionCookie(c, sessionToken)
  setCsrfCookie(c, csrfSecret)
  await audit('magic.consume', { userId: row.userId, ip: ip(c) })

  return c.redirect(user.mfaEnabled ? '/mfa-challenge' : '/trace', 302)
})
